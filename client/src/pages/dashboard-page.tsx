import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { ref, get, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Calendar, Users, Clock, Plus, Building2 } from "lucide-react";
import type { Room, RoomMember, OfficeSchedule, ChangeRequest, User } from "@shared/schema";
import { useEffect, useState } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [userRooms, setUserRooms] = useState<(Room & { memberRole: string })[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<(OfficeSchedule & { user: User, room: Room })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const roomMembersRef = ref(database, 'roomMembers');
    const unsubscribe = onValue(roomMembersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setUserRooms([]);
        return;
      }

      const members = snapshot.val();
      const userMemberEntries = Object.entries(members).filter(
        ([_, member]: any) => member.userId === currentUser.id && member.status === 'active'
      );

      const roomsData = await Promise.all(
        userMemberEntries.map(async ([_, member]: any) => {
          const roomSnapshot = await get(ref(database, `rooms/${member.roomId}`));
          if (roomSnapshot.exists()) {
            return { ...roomSnapshot.val(), memberRole: member.role };
          }
          return null;
        })
      );

      setUserRooms(roomsData.filter(Boolean));
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || userRooms.length === 0) return;

    const schedulesRef = ref(database, 'officeSchedules');
    const unsubscribe = onValue(schedulesRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setUpcomingSchedules([]);
        return;
      }

      const schedules = snapshot.val();
      const today = startOfDay(new Date()).getTime();
      const next7Days = addDays(today, 7).getTime();

      const upcoming = await Promise.all(
        Object.entries(schedules)
          .filter(([_, schedule]: any) => {
            const scheduleDate = new Date(schedule.date).getTime();
            return scheduleDate >= today && 
                   scheduleDate <= next7Days && 
                   userRooms.some(r => r.id === schedule.roomId);
          })
          .map(async ([_, schedule]: any) => {
            const [userSnap, roomSnap] = await Promise.all([
              get(ref(database, `users/${schedule.userId}`)),
              get(ref(database, `rooms/${schedule.roomId}`))
            ]);
            
            return {
              ...schedule,
              user: userSnap.val(),
              room: roomSnap.val()
            };
          })
      );

      setUpcomingSchedules(upcoming.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
    });

    return () => unsubscribe();
  }, [currentUser, userRooms]);

  useEffect(() => {
    if (!currentUser || userRooms.length === 0) return;

    const adminRoomIds = userRooms.filter(r => r.memberRole === 'admin').map(r => r.id);
    if (adminRoomIds.length === 0) {
      setPendingRequests([]);
      return;
    }

    const requestsRef = ref(database, 'changeRequests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingRequests([]);
        return;
      }

      const requests = snapshot.val();
      const pending = Object.values(requests).filter(
        (req: any) => req.status === 'pending' && adminRoomIds.includes(req.roomId)
      );

      setPendingRequests(pending as ChangeRequest[]);
    });

    return () => unsubscribe();
  }, [currentUser, userRooms]);

  if (!currentUser) return null;

  const thisWeekSchedules = upcomingSchedules.filter(s => s.userId === currentUser.id);
  const adminRooms = userRooms.filter(r => r.memberRole === 'admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {currentUser.name}
        </p>
      </div>

      {userRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create a room to start tracking your team's office schedule or join an existing room with an invite code.
            </p>
            <div className="flex gap-2">
              <Button data-testid="button-create-room" onClick={() => setLocation('/rooms')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
              <Button variant="outline" data-testid="button-join-room" onClick={() => setLocation('/rooms')}>
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Office Days This Week</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-week-count">
                  {thisWeekSchedules.filter(s => s.status === 'office').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {thisWeekSchedules.filter(s => s.status === 'office').length === 1 ? 'day' : 'days'} in the office
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Rooms</CardTitle>
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-rooms-count">
                  {userRooms.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {adminRooms.length} as admin
                </p>
              </CardContent>
            </Card>

            {adminRooms.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold" data-testid="text-pending-count">
                    {pendingRequests.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingRequests.length === 1 ? 'request' : 'requests'} awaiting review
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Office Days</CardTitle>
                <CardDescription>Your schedule for the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {thisWeekSchedules.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No office days scheduled
                  </div>
                ) : (
                  <div className="space-y-3">
                    {thisWeekSchedules.slice(0, 5).map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className="flex items-center justify-between py-2 border-b last:border-0"
                        data-testid={`schedule-${schedule.id}`}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(schedule.date), 'EEEE, MMM d')}
                          </p>
                          <p className="text-xs text-muted-foreground">{schedule.room.name}</p>
                        </div>
                        <Badge variant={schedule.status === 'office' ? 'default' : 'secondary'}>
                          {schedule.status === 'office' ? 'In Office' : 'Remote'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  data-testid="button-view-calendar"
                  onClick={() => setLocation('/calendar')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Full Calendar
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  data-testid="button-manage-rooms"
                  onClick={() => setLocation('/rooms')}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Manage Rooms
                </Button>
                {adminRooms.length > 0 && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    data-testid="button-review-requests"
                    onClick={() => setLocation('/requests')}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Review Requests
                    {pendingRequests.length > 0 && (
                      <Badge className="ml-auto" variant="destructive">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
