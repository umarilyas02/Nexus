// src/pages/EntrepreneurProfile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageCircle,
  Users,
  Calendar,
  Building2,
  MapPin,
  UserCircle,
  FileText,
  DollarSign,
  Send,
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { findUserById } from '../../data/users';
import { createCollaborationRequest, getRequestsFromInvestor } from '../../data/collaborationRequests';
import { Entrepreneur } from '../../types';

// Firebase
import { db } from '../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

// Calendar
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// UUID
import { v4 as uuidv4 } from 'uuid';

type MeetingDoc = {
  id?: string;
  entrepreneurId?: string;
  investorId?: string;
  investorName?: string;
  date?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  meetingLink?: string;
  createdAt?: string;
  [k: string]: any;
};

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  // Entrepreneur data (from your mock/local data layer)
  const entrepreneur = findUserById(id || '') as Entrepreneur | null;

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Meeting state for THIS investor-entrepreneur pair (single doc)
  const [myMeeting, setMyMeeting] = useState<MeetingDoc | null>(null);

  // stable investor id: prefer auth uid, fallback to anon stored in localStorage
  const getInvestorId = useCallback(() => {
    const maybeId = (currentCurrentUserIdCheck(currentUser) as any) && (currentUser as any).id;
    // note: above is defensive but we'll just use currentUser normally
    const maybe = (currentUser as any)?.id;
    if (maybe) return maybe;
    const key = 'anonInvestorId';
    let anon = localStorage.getItem(key);
    if (!anon) {
      anon = uuidv4();
      localStorage.setItem(key, anon);
    }
    return anon;
  }, [currentUser]);

  // deterministic doc id for the meeting (prevents duplicate docs)
  const buildMeetingDocId = useCallback((invId: string, entId: string) => {
    // keep it stable and simple
    return `${invId}_${entId}`;
  }, []);

  // Listen (realtime) for the specific meeting doc for this investor + entrepreneur
  useEffect(() => {
    if (!entrepreneur) return;

    const invId = getInvestorId();
    const meetingId = buildMeetingDocId(invId, entrepreneur.id);
    const meetingRef = doc(db, 'client-meetings', meetingId);

    const unsub = onSnapshot(
      meetingRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setMyMeeting(null);
        } else {
          const data = snapshot.data() as MeetingDoc;
          setMyMeeting({
            id: snapshot.id,
            ...data,
          });
        }
      },
      (err) => {
        console.error('meeting doc listener error:', err);
        setMyMeeting(null);
      }
    );

    return () => unsub();
  }, [entrepreneur, getInvestorId, buildMeetingDocId]);

  // Schedule meeting: prevents duplicates by checking existing doc first,
  // only allows overwrite when previous meeting.status === 'rejected' (reschedule)
  const handleScheduleMeeting = async () => {
    if (!selectedDate) {
      alert('Please pick a date and time first.');
      return;
    }
    if (!entrepreneur) {
      alert('Invalid entrepreneur.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    try {
      const invId = getInvestorId();
      const meetingId = buildMeetingDocId(invId, entrepreneur.id);
      const meetingRef = doc(db, 'client-meetings', meetingId);

      // check existing doc
      const existingSnap = await getDoc(meetingRef);
      if (existingSnap.exists()) {
        const existing = existingSnap.data() as MeetingDoc;
        if (existing.status === 'pending' || existing.status === 'accepted') {
          // Block scheduling if pending or already accepted
          alert('You already have a pending or accepted meeting with this entrepreneur.');
          setLoading(false);
          return;
        }
        // if rejected or other, we allow overwrite/reschedule
      }

      // Build payload and include a pre-created meetingLink so both sides read same link
      const payload: MeetingDoc = {
        entrepreneurId: entrepreneur.id,
        investorId: invId,
        investorName: (currentUser as any)?.name || 'Anonymous Investor',
        date: selectedDate.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        meetingLink: `/videocall/${meetingId}`, // <-- important: pre-create link
      };

      // Write to deterministic ID (prevents duplicates)
      await setDoc(meetingRef, payload);

      setSuccessMsg(`Meeting requested for ${selectedDate.toLocaleString()}`);
      setShowDatePicker(false);
      setSelectedDate(null);
      // myMeeting will update automatically from onSnapshot
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      alert('Failed to schedule meeting. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Render the appropriate button based on meeting state
  const renderInvestorButton = () => {
    if (myMeeting) {
      if (myMeeting.status === 'pending') {
        return <Button variant="outline" disabled>Pending Approval</Button>;
      }
      if (myMeeting.status === 'accepted') {
        // prefer the stored meetingLink; if missing, fallback to deterministic /videocall/<meetingId>
        const invId = getInvestorId();
        const meetingId = buildMeetingDocId(invId, entrepreneur!.id);
        const link = myMeeting.meetingLink || `/videocall/${meetingId}` || (myMeeting.id ? `/videocall/${myMeeting.id}` : `/videocall/${meetingId}`);
        return (
          <a
  href={myMeeting.meetingLink || `/videocall/${myMeeting.id}`}
  target="_blank"
  rel="noopener noreferrer"
>
  <Button variant="primary">Join Call</Button>
</a>

        );
      }
      if (myMeeting.status === 'rejected') {
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled>Request Rejected</Button>
            <Button leftIcon={<Calendar size={16} />} onClick={() => setShowDatePicker(true)}>Reschedule</Button>
          </div>
        );
      }
    }

    return (
      <Button leftIcon={<Calendar size={18} />} onClick={() => setShowDatePicker(s => !s)}>
        Schedule Meeting
      </Button>
    );
  };

  // guard: entrepreneur missing
  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/investor">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = (currentUser as any)?.id === entrepreneur.id;
  const isInvestor = true; // keep previous behavior (allow anon via local id)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Founder at {entrepreneur.startupName}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">{entrepreneur.industry}</Badge>
                <Badge variant="gray"><MapPin size={14} className="mr-1" />{entrepreneur.location}</Badge>
                <Badge variant="accent"><Calendar size={14} className="mr-1" />Founded {entrepreneur.foundedYear}</Badge>
                <Badge variant="secondary"><Users size={14} className="mr-1" />{entrepreneur.teamSize} team members</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>Message</Button>
                </Link>

                {isInvestor && renderInvestorButton()}

                {isInvestor && (
                  <Button
                    leftIcon={<Send size={18} />}
                    disabled={getRequestsFromInvestor((currentCurrentUserIdCheck(currentUser) as any)?.id || getInvestorId()).some((req) => req.entrepreneurId === entrepreneur.id)}
                    onClick={() => {
                      if ((currentUser as any)?.id) {
                        createCollaborationRequest((currentUser as any).id, entrepreneur.id, `I'm interested in learning more about ${entrepreneur.startupName}.`);
                        window.location.reload();
                      } else {
                        alert('Collaboration requests require login.');
                      }
                    }}
                  >
                    Request Collaboration
                  </Button>
                )}
              </>
            )}

            {isCurrentUser && <Button variant="outline" leftIcon={<UserCircle size={18} />}>Edit Profile</Button>}
          </div>
        </CardBody>
      </Card>

      {/* Date picker */}
      {showDatePicker && (
        <div className="p-4 border rounded-lg bg-white shadow-md max-w-sm mx-auto">
          <h3 className="text-lg font-semibold mb-2">Select a meeting date & time</h3>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date as Date)}
            showTimeSelect
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={new Date()}
            inline
          />
          <div className="flex gap-2 mt-3">
            <Button variant="primary" onClick={handleScheduleMeeting} disabled={!selectedDate || loading}>
              {loading ? 'Saving...' : 'Confirm Meeting'}
            </Button>
            <Button variant="outline" onClick={() => { setShowDatePicker(false); setSelectedDate(null); }} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMsg && <div className="p-3 bg-green-100 text-green-800 rounded-md text-center">{successMsg}</div>}

      {/* === rest of profile (About, Startup, Team, Funding, Documents) unchanged === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{entrepreneur.bio}</p>
            </CardBody>
          </Card>

          {/* Startup Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Problem Statement</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur?.pitchSummary?.split('.')[0]}.</p>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900">Solution</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur.pitchSummary}</p>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900">Market Opportunity</h3>
                  <p className="text-gray-700 mt-1">
                    The {entrepreneur.industry} market is experiencing significant growth, with a projected CAGR of 14.5% through 2027. Our solution addresses key pain points in this expanding market.
                  </p>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900">Competitive Advantage</h3>
                  <p className="text-gray-700 mt-1">
                    Unlike our competitors, we offer a unique approach that combines innovative technology with deep industry expertise, resulting in superior outcomes for our customers.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Team</h2>
              <span className="text-sm text-gray-500">{entrepreneur.teamSize} members</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar src={entrepreneur.avatarUrl} alt={entrepreneur.name} size="md" className="mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{entrepreneur.name}</h3>
                    <p className="text-xs text-gray-500">Founder & CEO</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar src="https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg" alt="Team Member" size="md" className="mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Alex Johnson</h3>
                    <p className="text-xs text-gray-500">CTO</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar src="https://images.pexels.com/photos/773371/pexels-photo-773371.jpeg" alt="Team Member" size="md" className="mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Jessica Chen</h3>
                    <p className="text-xs text-gray-500">Head of Product</p>
                  </div>
                </div>

                {entrepreneur.teamSize > 3 && (
                  <div className="flex items-center justify-center p-3 border border-dashed border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">+ {entrepreneur.teamSize - 3} more team members</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Funding</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Current Round</span>
                  <div className="flex items-center mt-1">
                    <DollarSign size={18} className="text-accent-600 mr-1" />
                    <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Valuation</span>
                  <p className="text-md font-medium text-gray-900">$8M - $12M</p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Previous Funding</span>
                  <p className="text-md font-medium text-gray-900">$750K Seed (2022)</p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Funding Timeline</span>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Pre-seed</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Completed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Seed</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Completed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Series A</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">In Progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Pitch Deck</h3>
                    <p className="text-xs text-gray-500">Updated 2 months ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Business Plan</h3>
                    <p className="text-xs text-gray-500">Updated 1 month ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Financial Projections</h3>
                    <p className="text-xs text-gray-500">Updated 2 weeks ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>

              {!isCurrentUser && isInvestor && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Request access to detailed documents and financials by sending a collaboration request.
                  </p>

                  {!getRequestsFromInvestor((currentUser as any)?.id || getInvestorId()).some((req) => req.entrepreneurId === entrepreneur.id) ? (
                    <Button className="mt-3 w-full" onClick={() => {
                      if ((currentUser as any)?.id) {
                        createCollaborationRequest((currentUser as any).id, entrepreneur.id, `I'm interested in ${entrepreneur.startupName}`);
                        window.location.reload();
                      } else {
                        alert('You must be logged in to send collaboration requests.');
                      }
                    }}>
                      Request Collaboration
                    </Button>
                  ) : (
                    <Button className="mt-3 w-full" disabled>Request Sent</Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EntrepreneurProfile;

// small helper used above for defensive check prevents TS error
function currentCurrentUserIdCheck(u: any) {
  return u;
}
