// src/pages/VideoCall.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Peer from 'simple-peer';
import { db } from '../../firebase';
import { doc, getDoc, collection, addDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

export const VideoCall: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();

  const [stream, setStream] = useState<MediaStream>();
  const [peerStream, setPeerStream] = useState<MediaStream>();
  const [callStatus, setCallStatus] = useState('Connecting...');

  const myVideo = useRef<HTMLVideoElement>(null);
  const peerVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance>();

  useEffect(() => {
    if (!meetingId) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(currentStream => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }

        const callDocRef = doc(db, 'client-meetings', meetingId);
        const offersCollection = collection(callDocRef, 'offers');
        const answersCollection = collection(callDocRef, 'answers');

        // Check if we are the initiator or the receiver
        getDoc(callDocRef).then(async docSnap => {
          if (!docSnap.exists() || docSnap.data().status !== 'accepted') {
            setCallStatus('Invalid or unaccepted meeting.');
            return;
          }

          const offerCandidates = collection(offersCollection, 'candidates');
          const answerCandidates = collection(answersCollection, 'candidates');

          const isInitiator = !(await getDoc(doc(offersCollection, 'offer'))).exists();
          setCallStatus(isInitiator ? 'Creating Call...' : 'Joining Call...');

          const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            stream: currentStream,
          });

          peerRef.current = peer;

          // Listen for signaling data and send it via Firestore
          peer.on('signal', async (data) => {
            if (isInitiator) {
              await addDoc(offersCollection, { offer: data });
            } else {
              await addDoc(answersCollection, { answer: data });
            }
          });

          // Listen for the remote stream
          peer.on('stream', remoteStream => {
            setPeerStream(remoteStream);
            if (peerVideo.current) {
              peerVideo.current.srcObject = remoteStream;
            }
            setCallStatus('Connected');
          });

          peer.on('close', () => {
            // Handle cleanup
            setCallStatus('Call Ended');
            currentStream.getTracks().forEach(track => track.stop());
          });
          
          // Listen for offers if we are the receiver
          if (!isInitiator) {
            onSnapshot(offersCollection, snapshot => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                   peer.signal(change.doc.data().offer);
                }
              });
            });
          }
          
          // Listen for answers if we are the initiator
          if (isInitiator) {
             onSnapshot(answersCollection, snapshot => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                   peer.signal(change.doc.data().answer);
                }
              });
            });
          }
        });
      })
      .catch(err => {
        console.error('Failed to get user media', err);
        setCallStatus('Camera/Mic access denied.');
      });

    // Cleanup on unmount
    return () => {
      peerRef.current?.destroy();
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [meetingId]);

  return (
    <div className="p-4 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Meeting ID: {meetingId}</h1>
      <p className="mb-4">{callStatus}</p>
      
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
        {/* Peer Video (Full screen) */}
        <video
          ref={peerVideo}
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* My Video (Picture-in-picture style) */}
        <video
          ref={myVideo}
          playsInline
          muted
          autoPlay
          className="absolute top-4 right-4 w-1/4 max-w-[200px] border-2 border-gray-500 rounded-md"
        />
      </div>

       <button 
         onClick={() => peerRef.current?.destroy()}
         className="mt-6 px-6 py-2 bg-red-600 rounded-full hover:bg-red-700 transition"
       >
         End Call
       </button>
    </div>
  );
};