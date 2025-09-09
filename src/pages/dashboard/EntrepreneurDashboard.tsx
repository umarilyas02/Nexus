// src/pages/dashboard/EntrepreneurDashboard.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Bell,
  Calendar,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Check,
  X,
  Video,
  Wallet,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { CollaborationRequestCard } from "../../components/collaboration/CollaborationRequestCard";
import { InvestorCard } from "../../components/investor/InvestorCard";
import { useAuth } from "../../context/AuthContext";
import { CollaborationRequest } from "../../types";
import { getRequestsForEntrepreneur } from "../../data/collaborationRequests";
import { investors } from "../../data/users";

// Firebase
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

type MeetingDoc = {
  id?: string;
  entrepreneurId?: string;
  investorId?: string;
  investorName?: string;
  date?: string;
  status?: "pending" | "accepted" | "rejected";
  meetingLink?: string;
  createdAt?: string;
  [k: string]: any;
};

export const EntrepreneurDashboard: React.FC = () => {
  const { user } = useAuth();

  // Collab requests (from your local data layer)
  const [collaborationRequests, setCollaborationRequests] = useState<
    CollaborationRequest[]
  >([]);
  const [recommendedInvestors, setRecommendedInvestors] = useState(
    investors.slice(0, 3)
  );

  // Meetings (from Firestore)
  const [meetingRequests, setMeetingRequests] = useState<MeetingDoc[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  useEffect(() => {
    if (user) {
      const requests = getRequestsForEntrepreneur(user.id);
      setCollaborationRequests(requests);
    }
  }, [user]);

  // Real-time listener for meetings where entrepreneurId = current user
  useEffect(() => {
    if (!user || user.role !== "entrepreneur") return;

    setLoadingMeetings(true);
    const meetingsQuery = query(
      collection(db, "client-meetings"),
      where("entrepreneurId", "==", user.id)
    );

    const unsub = onSnapshot(
      meetingsQuery,
      (snapshot) => {
        const requests: MeetingDoc[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MeetingDoc),
        }));
        setMeetingRequests(requests);
        setLoadingMeetings(false);
      },
      (error) => {
        console.error("Error fetching meeting requests:", error);
        setLoadingMeetings(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Accept/Reject meeting (ensures meetingLink exists when accepting)
  const handleMeetingStatusUpdate = async (
    investorId: string,
    newStatus: "accepted" | "rejected"
  ) => {
    if (!user) return;

    const meetingId = `${investorId}_${user.id}`;
    const meetingRef = doc(db, "client-meetings", meetingId);

    try {
      if (newStatus === "accepted") {
        // Read existing doc to preserve an existing meetingLink if present
        const snap = await getDoc(meetingRef);
        const existing = snap.exists() ? (snap.data() as MeetingDoc) : null;

        // Use existing meetingLink if available, otherwise create deterministic link
        const meetingLink = existing?.meetingLink || `/videocall/${meetingId}`;

        // Write both status and meetingLink (merge to keep other fields)
        await setDoc(
          meetingRef,
          {
            status: "accepted",
            meetingLink,
          },
          { merge: true }
        );
      } else {
        // Rejected — just update status
        await setDoc(meetingRef, { status: "rejected" }, { merge: true });
      }
    } catch (error) {
      console.error(`Error updating meeting to ${newStatus}:`, error);
      alert("Failed to update meeting status.");
    }
  };

  if (!user) return null;

  // Derivations for UI
  const pendingRequests = collaborationRequests.filter(
    (req) => req.status === "pending"
  );
  const pendingMeetingRequests = meetingRequests.filter(
    (m) => m.status === "pending"
  );
  const upcomingMeetings = meetingRequests.filter((m) => m.status === "accepted");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      Welcome, {user.name}
    </h1>
    <p className="text-gray-600">
      Here's what's happening with your startup today
    </p>
  </div>

  <div className="flex items-center gap-2">
    {/* Existing Find Investors Button */}
    <Link to="/investors">
      <Button leftIcon={<PlusCircle size={18} />}>Find Investors</Button>
    </Link>

    {/* New Wallet Button */}
    <Link to="/wallet">
      <Button leftIcon={<Wallet size={18} />} variant="secondary">
        Wallet
      </Button>
    </Link>
  </div>
</div>


      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-50 border border-primary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-full mr-4">
                <Bell size={20} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">
                  Pending Collabs
                </p>
                <h3 className="text-xl font-semibold text-primary-900">
                  {pendingRequests.length}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-secondary-50 border border-secondary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-full mr-4">
                <Users size={20} className="text-secondary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-700">
                  Total Connections
                </p>
                <h3 className="text-xl font-semibold text-secondary-900">
                  {
                    collaborationRequests.filter(
                      (req) => req.status === "accepted"
                    ).length
                  }
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-accent-50 border border-accent-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <Calendar size={20} className="text-accent-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-700">
                  Upcoming Meetings
                </p>
                <h3 className="text-xl font-semibold text-accent-900">
                  {upcomingMeetings.length}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-success-50 border border-success-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <TrendingUp size={20} className="text-success-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-success-700">
                  Profile Views
                </p>
                <h3 className="text-xl font-semibold text-success-900">24</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming (Accepted) Meetings */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Upcoming Meetings
              </h2>
              <Badge variant="success">
                {upcomingMeetings.length} scheduled
              </Badge>
            </CardHeader>
            <CardBody>
              {loadingMeetings ? (
                <div className="text-center py-4 text-gray-500">
                  Loading meetings...
                </div>
              ) : upcomingMeetings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {meeting.investorName || "An Investor"}
                        </p>
                        <p className="text-sm text-gray-600">
                          On:{" "}
                          {meeting.date
                            ? new Date(meeting.date).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <Link
                        to={meeting.meetingLink || `/videocall/${meeting.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Video size={16} />}
                        >
                          Join Call
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Calendar size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No upcoming meetings</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Accept a meeting request to see it here.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Meeting Requests (Pending) */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Meeting Requests
              </h2>
              <Badge variant="accent">
                {pendingMeetingRequests.length} pending
              </Badge>
            </CardHeader>
            <CardBody>
              {loadingMeetings ? (
                <div className="text-center py-4 text-gray-500">
                  Loading requests...
                </div>
              ) : pendingMeetingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingMeetingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {req.investorName || "An Investor"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Requested for:{" "}
                          {req.date ? new Date(req.date).toLocaleString() : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Check size={16} />}
                          onClick={() =>
                            handleMeetingStatusUpdate(
                              req.investorId || (req.id?.split("_")[0] ?? ""),
                              "accepted"
                            )
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<X size={16} />}
                          onClick={() =>
                            handleMeetingStatusUpdate(
                              req.investorId || (req.id?.split("_")[0] ?? ""),
                              "rejected"
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Calendar size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No pending meeting requests</p>
                  <p className="text-sm text-gray-500 mt-1">
                    When investors schedule a meeting, it will appear here.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Collaboration Requests */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Collaboration Requests
              </h2>
              <Badge variant="primary">{pendingRequests.length} pending</Badge>
            </CardHeader>
            <CardBody>
              {collaborationRequests.length > 0 ? (
                <div className="space-y-4">
                  {collaborationRequests.map((request) => (
                    <CollaborationRequestCard
                      key={request.id}
                      request={request}
                      onStatusUpdate={(id, status) => {
                        setCollaborationRequests((prev) =>
                          prev.map((req) =>
                            req.id === id ? { ...req, status } : req
                          )
                        );
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No collaboration requests yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    When investors are interested in your startup, their
                    requests will appear here
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column: Recommended Investors */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Recommended Investors
              </h2>
              <Link
                to="/investors"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </CardHeader>

            <CardBody className="space-y-4">
              {recommendedInvestors.map((investor) => (
                <InvestorCard
                  key={investor.id}
                  investor={investor}
                  showActions={true}
                  onScheduleMeeting={() =>
                    alert("Please schedule from the investor's profile page.")
                  }
                />
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EntrepreneurDashboard;
