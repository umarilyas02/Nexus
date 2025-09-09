// src/pages/VideoCall.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: ['turn:openrelay.metered.ca:80'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export const VideoCall: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState<string>('Connecting...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setError('Missing meeting id');
      setStatus('Failed');
      return;
    }

    let unsubOfferCandidates: (() => void) | null = null;
    let unsubAnswerCandidates: (() => void) | null = null;
    let unsubMeetingDoc: (() => void) | null = null;

    const init = async () => {
      try {
        pcRef.current = new RTCPeerConnection(ICE_SERVERS);

        pcRef.current.oniceconnectionstatechange = () => {
          console.debug('ICE connection state:', pcRef.current?.iceConnectionState);
          const s = pcRef.current?.iceConnectionState;
          if (s === 'connected' || s === 'completed') setStatus('Connected');
          else if (s === 'failed' || s === 'disconnected') setStatus('Disconnected');
        };

        pcRef.current.onconnectionstatechange = () => {
          console.debug('Peer connection state:', pcRef.current?.connectionState);
          const s = pcRef.current?.connectionState;
          if (s === 'connected') setStatus('Connected');
        };

        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        localStream.getTracks().forEach((track) => pcRef.current?.addTrack(track, localStream));

        pcRef.current.ontrack = (event) => {
          console.debug('ontrack event', event);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('Connected');
          }
        };

        const meetingRef = doc(db, 'client-meetings', meetingId);
        const offerCandidatesRef = collection(meetingRef, 'offerCandidates');
        const answerCandidatesRef = collection(meetingRef, 'answerCandidates');

        const meetingSnapshot = await getDoc(meetingRef);
        const isOfferer = !meetingSnapshot.exists() || !meetingSnapshot.data()?.offer;
        console.debug('isOfferer:', isOfferer);

        // 🔥 FIX: force ICE writes + logs
        pcRef.current.onicecandidate = (event) => {
          console.debug('ICE candidate event fired:', event.candidate);
          if (event.candidate) {
            const payload = event.candidate.toJSON();
            const targetRef = isOfferer ? offerCandidatesRef : answerCandidatesRef;
            addDoc(targetRef, payload)
              .then(() => console.debug('✅ ICE candidate added:', payload))
              .catch((err) => console.error('🔥 Failed to write ICE candidate:', err));
          } else {
            console.debug('ICE gathering complete');
          }
        };

        // Always listen for both
        unsubOfferCandidates = onSnapshot(offerCandidatesRef, (snap: QuerySnapshot) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              console.debug('📥 Incoming offerCandidate from Firestore:', data);
              try {
                const candidate = new RTCIceCandidate(data);
                pcRef.current?.addIceCandidate(candidate).catch((err) => {
                  console.warn('addIceCandidate (offerCandidates) failed:', err);
                });
              } catch (err) {
                console.warn('Invalid ICE candidate from offerCandidates:', err, data);
              }
            }
          });
        });

        unsubAnswerCandidates = onSnapshot(answerCandidatesRef, (snap: QuerySnapshot) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              console.debug('📥 Incoming answerCandidate from Firestore:', data);
              try {
                const candidate = new RTCIceCandidate(data);
                pcRef.current?.addIceCandidate(candidate).catch((err) => {
                  console.warn('addIceCandidate (answerCandidates) failed:', err);
                });
              } catch (err) {
                console.warn('Invalid ICE candidate from answerCandidates:', err, data);
              }
            }
          });
        });

        if (isOfferer) {
          const offerDescription = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offerDescription);

          const offer = { type: offerDescription.type, sdp: offerDescription.sdp };
          await setDoc(meetingRef, { offer }, { merge: true });
          console.debug('Offer written to Firestore');

          unsubMeetingDoc = onSnapshot(meetingRef, async (snapshot) => {
            const data = snapshot.data();
            if (!data) return;
            if (data.answer && pcRef.current && !pcRef.current.currentRemoteDescription) {
              try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                console.debug('Offerer set remote description (answer)');
                setStatus('Connected');
              } catch (err) {
                console.error('Offerer failed to set remote description:', err);
              }
            }
          });
        } else {
          const offer = meetingSnapshot.data()?.offer;
          if (!offer) throw new Error('Offer missing on meeting doc for answerer');

          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          console.debug('Answerer set remote description (offer)');

          const answerDescription = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answerDescription);

          const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
          await updateDoc(meetingRef, { answer });
          console.debug('Answer written to Firestore');
        }
      } catch (err) {
        console.error('Initialization error in VideoCall:', err);
        setError((err as Error).message || 'Unknown error');
        setStatus('Failed');
      }
    };

    init();

    return () => {
      try {
        if (pcRef.current) {
          pcRef.current.getTransceivers().forEach((t) => {
            try { t.stop(); } catch {}
          });
          pcRef.current.close();
          pcRef.current = null;
        }
      } catch (e) {
        console.warn('Error closing peer connection on cleanup', e);
      }

      if (unsubOfferCandidates) unsubOfferCandidates();
      if (unsubAnswerCandidates) unsubAnswerCandidates();
      if (unsubMeetingDoc) unsubMeetingDoc();
    };
  }, [meetingId]);

  const handleEndCall = () => {
    try {
      if (pcRef.current) pcRef.current.close();
      if (localVideoRef.current?.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      if (remoteVideoRef.current?.srcObject) {
        (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('Error ending call', e);
    }
    setStatus('Disconnected');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white space-y-4 p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">{status}</h1>
        {error && <p className="text-sm text-red-400 mt-2">Error: {error}</p>}
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <div>
          <h2 className="text-sm text-gray-300 mb-1">You</h2>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-72 h-56 bg-black rounded" />
        </div>
        <div>
          <h2 className="text-sm text-gray-300 mb-1">Remote</h2>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-72 h-56 bg-black rounded" />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleEndCall}
          className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
