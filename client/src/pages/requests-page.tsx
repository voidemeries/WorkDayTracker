import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get, onValue, update, push, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Clock, Check, X, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Room, RoomMember, ChangeRequest, User, OfficeSchedule } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function RequestsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [adminRooms, setAdminRooms] = useState<Room[]>([]);
  const [joinRequests, setJoinRequests] = useState<(RoomMember & { user: User, room: Room })[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<(ChangeRequest & { user: User, room: Room })[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const roomMembersRef = ref(database, 'roomMembers');
    const unsubscribe = onValue(roomMembersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setAdminRooms([]);
        return;
      }

      const members = snapshot.val();
      const adminMemberEntries = Object.entries(members).filter(
        ([_, member]: any) => member.userId === currentUser.id && member.role === 'admin' && member.status === 'active'
      );

      const roomsData = await Promise.all(
        adminMemberEntries.map(async ([_, member]: any) => {
          const roomSnapshot = await get(ref(database, `rooms/${member.roomId}`));
          if (roomSnapshot.exists()) {
            return roomSnapshot.val();
          }
          return null;
        })
      );

      setAdminRooms(roomsData.filter(Boolean));
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (adminRooms.length === 0) return;

    const adminRoomIds = adminRooms.map(r => r.id);

    const membersRef = ref(database, 'roomMembers');
    const unsubscribe = onValue(membersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setJoinRequests([]);
        return;
      }

      const members = snapshot.val();
      const pendingMembers = await Promise.all(
        Object.entries(members)
          .filter(([_, member]: any) => 
            member.status === 'pending' && adminRoomIds.includes(member.roomId)
          )
          .map(async ([id, member]: any) => {
            const [userSnap, roomSnap] = await Promise.all([
              get(ref(database, `users/${member.userId}`)),
              get(ref(database, `rooms/${member.roomId}`))
            ]);
            
            return {
              ...member,
              id,
              user: userSnap.val(),
              room: roomSnap.val()
            };
          })
      );

      setJoinRequests(pendingMembers);
    });

    return () => unsubscribe();
  }, [adminRooms]);

  useEffect(() => {
    if (adminRooms.length === 0) return;

    const adminRoomIds = adminRooms.map(r => r.id);

    const requestsRef = ref(database, 'changeRequests');
    const unsubscribe = onValue(requestsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setScheduleRequests([]);
        return;
      }

      const requests = snapshot.val();
      const pendingRequests = await Promise.all(
        Object.entries(requests)
          .filter(([_, req]: any) => 
            req.status === 'pending' && adminRoomIds.includes(req.roomId)
          )
          .map(async ([id, req]: any) => {
            const [userSnap, roomSnap] = await Promise.all([
              get(ref(database, `users/${req.userId}`)),
              get(ref(database, `rooms/${req.roomId}`))
            ]);
            
            return {
              ...req,
              id,
              user: userSnap.val(),
              room: roomSnap.val()
            };
          })
      );

      setScheduleRequests(pendingRequests.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, [adminRooms]);

  const handleApproveJoinRequest = async (memberId: string) => {
    try {
      await update(ref(database, `roomMembers/${memberId}`), { status: 'active' });
      toast({
        title: "Approved",
        description: "Member has been approved and can now access the room",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not approve request",
      });
    }
  };

  const handleRejectJoinRequest = async (memberId: string) => {
    try {
      await set(ref(database, `roomMembers/${memberId}`), null);
      toast({
        title: "Rejected",
        description: "Join request has been rejected",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reject request",
      });
    }
  };

  const handleApproveScheduleRequest = async (request: ChangeRequest & { user: User, room: Room }) => {
    try {
      await update(ref(database, `changeRequests/${request.id}`), {
        status: 'approved',
        resolvedAt: Date.now(),
        resolvedBy: currentUser!.id,
      });

      if (request.originalDate) {
        const schedulesSnapshot = await get(ref(database, 'officeSchedules'));
        if (schedulesSnapshot.exists()) {
          const schedules = schedulesSnapshot.val();
          const oldScheduleEntry = Object.entries(schedules).find(
            ([_, s]: any) => 
              s.userId === request.userId && 
              s.roomId === request.roomId && 
              s.date === request.originalDate
          );
          
          if (oldScheduleEntry) {
            await set(ref(database, `officeSchedules/${oldScheduleEntry[0]}`), null);
          }
        }
      }

      const newScheduleRef = push(ref(database, 'officeSchedules'));
      const newSchedule: OfficeSchedule = {
        id: newScheduleRef.key!,
        roomId: request.roomId,
        userId: request.userId,
        date: request.newDate,
        status: 'office',
        createdAt: Date.now(),
      };
      await set(newScheduleRef, newSchedule);

      toast({
        title: "Approved",
        description: "Schedule change has been approved",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not approve request",
      });
    }
  };

  const handleRejectScheduleRequest = async (requestId: string) => {
    try {
      await update(ref(database, `changeRequests/${requestId}`), {
        status: 'rejected',
        resolvedAt: Date.now(),
        resolvedBy: currentUser!.id,
      });

      toast({
        title: "Rejected",
        description: "Schedule change request has been rejected",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reject request",
      });
    }
  };

  if (!currentUser) return null;

  if (adminRooms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage join and schedule change requests
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No admin access</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              You need to be an admin of at least one room to manage requests.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve pending requests
        </p>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule" data-testid="tab-schedule-requests">
            Schedule Changes
            {scheduleRequests.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {scheduleRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="join" data-testid="tab-join-requests">
            Join Requests
            {joinRequests.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {joinRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {scheduleRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Check className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up</h3>
                <p className="text-sm text-muted-foreground">
                  No pending schedule change requests
                </p>
              </CardContent>
            </Card>
          ) : (
            scheduleRequests.map((request) => (
              <Card key={request.id} data-testid={`schedule-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {request.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{request.user?.name}</CardTitle>
                        <CardDescription>{request.room?.name}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {format(request.createdAt, 'MMM d, h:mm a')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Schedule Change Request</p>
                    <div className="flex items-center gap-3 text-sm">
                      {request.originalDate ? (
                        <>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Change FROM:</p>
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{format(new Date(request.originalDate), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground mt-5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Change TO:</p>
                            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="font-medium">{format(new Date(request.newDate), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Add New Office Day:</p>
                          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">{format(new Date(request.newDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.reason && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      data-testid={`button-approve-schedule-${request.id}`}
                      onClick={() => handleApproveScheduleRequest(request)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      data-testid={`button-reject-schedule-${request.id}`}
                      onClick={() => handleRejectScheduleRequest(request.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="join" className="space-y-4">
          {joinRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Check className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up</h3>
                <p className="text-sm text-muted-foreground">
                  No pending join requests
                </p>
              </CardContent>
            </Card>
          ) : (
            joinRequests.map((request) => (
              <Card key={request.id} data-testid={`join-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {request.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{request.user?.name}</CardTitle>
                        <CardDescription>{request.user?.email}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {format(request.createdAt, 'MMM d, h:mm a')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Requesting to join</p>
                    <p className="text-sm font-medium">{request.room?.name}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      data-testid={`button-approve-join-${request.id}`}
                      onClick={() => handleApproveJoinRequest(request.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      data-testid={`button-reject-join-${request.id}`}
                      onClick={() => handleRejectJoinRequest(request.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
