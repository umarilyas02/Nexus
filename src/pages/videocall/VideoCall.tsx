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
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]); // queue for ICE candidates

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
          const s = pcRef.current?.iceConnectionState;
          if (s === 'connected' || s === 'completed') setStatus('Connected');
          else if (s === 'failed' || s === 'disconnected') setStatus('Disconnected');
        };

        pcRef.current.onconnectionstatechange = () => {
          if (pcRef.current?.connectionState === 'connected') setStatus('Connected');
        };

        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        localStream.getTracks().forEach((track) => pcRef.current?.addTrack(track, localStream));

        pcRef.current.ontrack = (event) => {
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

        // handle ICE candidates
        pcRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            const payload = event.candidate.toJSON();
            const targetRef = isOfferer ? offerCandidatesRef : answerCandidatesRef;
            addDoc(targetRef, payload).catch((err) => console.error('Failed to add ICE:', err));
          }
        };

        // listen for remote ICE
        unsubOfferCandidates = onSnapshot(offerCandidatesRef, (snap: QuerySnapshot) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              handleRemoteCandidate(data);
            }
          });
        });

        unsubAnswerCandidates = onSnapshot(answerCandidatesRef, (snap: QuerySnapshot) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              handleRemoteCandidate(data);
            }
          });
        });

        const handleRemoteCandidate = (data: any) => {
          const candidate = new RTCIceCandidate(data);
          if (pcRef.current?.remoteDescription) {
            pcRef.current.addIceCandidate(candidate).catch((err) => console.warn('ICE failed:', err));
          } else {
            iceQueueRef.current.push(data);
          }
        };

        if (isOfferer) {
          const offerDescription = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offerDescription);
          await setDoc(meetingRef, { offer: offerDescription, active: true }, { merge: true });

          unsubMeetingDoc = onSnapshot(meetingRef, async (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && pcRef.current && !pcRef.current.currentRemoteDescription) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
              flushIceQueue();
              setStatus('Connected');
            }
          });
        } else {
          const offer = meetingSnapshot.data()?.offer;
          if (!offer) throw new Error('No offer found for meeting');

          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answerDescription = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answerDescription);
          await updateDoc(meetingRef, { answer: answerDescription, active: true });
          flushIceQueue();
        }
      } catch (err) {
        setError((err as Error).message);
        setStatus('Failed');
      }
    };

    const flushIceQueue = () => {
      while (iceQueueRef.current.length && pcRef.current?.remoteDescription) {
        const candidate = new RTCIceCandidate(iceQueueRef.current.shift()!);
        pcRef.current.addIceCandidate(candidate).catch(console.error);
      }
    };

    init();

    const handleUnload = async () => {
      try {
        if (meetingId) {
          const meetingRef = doc(db, 'client-meetings', meetingId);
          await updateDoc(meetingRef, { active: false });
        }
      } catch {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (pcRef.current) {
        pcRef.current.getTransceivers().forEach((t) => t.stop());
        pcRef.current.close();
        pcRef.current = null;
      }
      if (unsubOfferCandidates) unsubOfferCandidates();
      if (unsubAnswerCandidates) unsubAnswerCandidates();
      if (unsubMeetingDoc) unsubMeetingDoc();
    };
  }, [meetingId]);

  const handleEndCall = async () => {
    if (pcRef.current) pcRef.current.close();
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    if (meetingId) {
      const meetingRef = doc(db, 'client-meetings', meetingId);
      await updateDoc(meetingRef, { active: false });
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
