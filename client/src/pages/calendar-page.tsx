import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get, onValue, push, set, remove } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Plus, UserPlus, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import type { Room, RoomMember, OfficeSchedule, User, ChangeRequest } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [userRooms, setUserRooms] = useState<(Room & { memberRole: string })[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<(OfficeSchedule & { user: User })[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [originalScheduleDate, setOriginalScheduleDate] = useState<Date | undefined>(undefined);
  const [newScheduleDate, setNewScheduleDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [roomMembers, setRoomMembers] = useState<(RoomMember & { user: User })[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [assignDates, setAssignDates] = useState<Date[]>([]);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);


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

      const rooms = roomsData.filter(Boolean);
      setUserRooms(rooms);
      if (rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rooms[0].id);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedRoomId) return;

    const schedulesRef = ref(database, 'officeSchedules');
    const unsubscribe = onValue(schedulesRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setSchedules([]);
        return;
      }

      const schedules = snapshot.val();
      const roomSchedules = await Promise.all(
        Object.entries(schedules)
          .filter(([_, schedule]: any) => schedule.roomId === selectedRoomId)
          .map(async ([id, schedule]: any) => {
            const userSnapshot = await get(ref(database, `users/${schedule.userId}`));
            return { ...schedule, id, user: userSnapshot.val() };
          })
      );

      setSchedules(roomSchedules);
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) return;

    const roomMembersRef = ref(database, 'roomMembers');
    const unsubscribe = onValue(roomMembersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setRoomMembers([]);
        return;
      }

      const members = snapshot.val();
      const roomMembersList = await Promise.all(
        Object.entries(members)
          .filter(([_, member]: any) => member.roomId === selectedRoomId && member.status === 'active')
          .map(async ([id, member]: any) => {
            const userSnapshot = await get(ref(database, `users/${member.userId}`));
            return { ...member, id, user: userSnapshot.val() };
          })
      );

      setRoomMembers(roomMembersList);
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  const handleAssignSchedules = async () => {
    if (!currentUser || !selectedRoomId || selectedMembers.length === 0 || assignDates.length === 0) return;

    try {
      const schedulesRef = ref(database, 'officeSchedules');

      for (const memberId of selectedMembers) {
        const member = roomMembers.find(m => m.id === memberId);
        if (!member) continue;

        for (const date of assignDates) {
          const newScheduleRef = push(schedulesRef);
          const newSchedule: OfficeSchedule = {
            id: newScheduleRef.key!,
            roomId: selectedRoomId,
            userId: member.userId,
            date: format(date, 'yyyy-MM-dd'),
            status: 'office',
            createdAt: Date.now(),
          };
          await set(newScheduleRef, newSchedule);
        }
      }

      toast({
        title: "Schedules assigned",
        description: `Assigned ${assignDates.length} date(s) to ${selectedMembers.length} member(s)`,
      });

      setAssignDialogOpen(false);
      setSelectedMembers([]);
      setAssignDates([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not assign schedules",
      });
    }
  };

  const handleRequestChange = async () => {
    if (!currentUser || !selectedRoomId || !newScheduleDate || !originalScheduleDate) return;

    try {
      const requestsRef = ref(database, 'changeRequests');
      const newRequestRef = push(requestsRef);

      const newRequest: ChangeRequest = {
        id: newRequestRef.key!,
        roomId: selectedRoomId,
        userId: currentUser.id,
        originalDate: originalScheduleDate ? format(originalScheduleDate, 'yyyy-MM-dd') : null,
        newDate: format(newScheduleDate, 'yyyy-MM-dd'),
        reason: reason.trim() || undefined,
        status: 'pending',
        createdAt: Date.now(),
        resolvedAt: null,
        resolvedBy: null,
      };

      await set(newRequestRef, newRequest);

      toast({
        title: "Request submitted",
        description: "Your schedule change request has been sent for approval",
      });

      setRequestDialogOpen(false);
      setOriginalScheduleDate(undefined);
      setNewScheduleDate(undefined);
      setReason("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit request",
      });
    }
  };

  const handleSubmitChange = async () => {
    if (!newScheduleDate || !selectedRoomId || !currentUser) return;

    const requestId = push(ref(database, 'changeRequests')).key;
    const newRequest = {
      id: requestId,
      roomId: selectedRoomId,
      userId: currentUser.id,
      originalDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      newDate: format(newScheduleDate, 'yyyy-MM-dd'),
      reason: reason || null,
      status: 'pending',
      createdAt: Date.now(),
      resolvedAt: null,
      resolvedBy: null
    };

    try {
      await set(ref(database, `changeRequests/${requestId}`), newRequest);
      toast({
        title: "Request Submitted",
        description: "Your schedule change request has been sent to the admin for approval",
      });
      setRequestDialogOpen(false);
      setNewScheduleDate(undefined);
      setReason('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit request",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, isAdmin: boolean) => {
    if (!currentUser || !selectedRoomId) return;

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    if (isAdmin) {
      // Admin can delete directly
      try {
        await remove(ref(database, `officeSchedules/${scheduleId}`));
        toast({
          title: "Deleted",
          description: "Office day has been removed",
        });
        setShowDeleteDialog(false);
        setDeleteScheduleId(null);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not delete schedule",
        });
      }
    } else {
      // Regular user must request deletion
      const requestId = push(ref(database, 'changeRequests')).key;
      const deleteRequest = {
        id: requestId,
        roomId: selectedRoomId,
        userId: currentUser.id,
        originalDate: schedule.date,
        newDate: null, // null indicates deletion request
        reason: reason || 'Requested to delete office day',
        status: 'pending',
        createdAt: Date.now(),
        resolvedAt: null,
        resolvedBy: null
      };

      try {
        await set(ref(database, `changeRequests/${requestId}`), deleteRequest);
        toast({
          title: "Delete Request Submitted",
          description: "Your request to delete this office day has been sent to the admin for approval",
        });
        setShowDeleteDialog(false);
        setDeleteScheduleId(null);
        setReason('');
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not submit delete request",
        });
      }
    }
  };

  if (!currentUser) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(s => isSameDay(new Date(s.date), date));
  };

  const selectedRoom = userRooms.find(r => r.id === selectedRoomId);
  const daySchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];
  const userScheduleForDay = daySchedules.find(s => s.userId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage office schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRoom && selectedRoom.memberRole === 'admin' && (
            <Dialog 
              open={assignDialogOpen} 
              onOpenChange={(open) => {
                setAssignDialogOpen(open);
                if (!open) {
                  setSelectedMembers([]);
                  setAssignDates([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="default" data-testid="button-assign-team">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Team to Office Dates</DialogTitle>
                  <DialogDescription>
                    Select team members and dates to assign them to the office
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Team Members</Label>
                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                      {roomMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No team members in this room
                        </p>
                      ) : (
                        roomMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, member.id]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                }
                              }}
                              data-testid={`checkbox-member-${member.id}`}
                            />
                            <label htmlFor={`member-${member.id}`} className="flex-1 flex items-center gap-2 cursor-pointer">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {member.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.user?.name}</span>
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {member.role}
                              </Badge>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select Dates {assignDates.length > 0 && `(${assignDates.length} selected)`}
                    </Label>
                    <Calendar
                      mode="multiple"
                      selected={assignDates}
                      onSelect={(dates) => setAssignDates(dates || [])}
                      className="rounded-md border"
                      data-testid="calendar-assign-dates"
                    />
                  </div>
                  <Button 
                    onClick={handleAssignSchedules}
                    data-testid="button-submit-assign"
                    className="w-full"
                    disabled={selectedMembers.length === 0 || assignDates.length === 0}
                  >
                    Assign {selectedMembers.length} member(s) to {assignDates.length} date(s)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {userRooms.length > 0 && (
            <Select value={selectedRoomId || undefined} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-[200px]" data-testid="select-room">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {userRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {userRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms available</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Join or create a room to start managing your office schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    data-testid="button-prev-month"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    data-testid="button-next-month"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={idx}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square p-2 rounded-md text-sm hover-elevate active-elevate-2 border
                        ${!isCurrentMonth ? 'text-muted-foreground opacity-40' : ''}
                        ${isToday ? 'border-primary' : 'border-border'}
                        ${isSelected ? 'bg-accent' : ''}
                      `}
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className={isToday ? 'font-semibold' : ''}>{format(day, 'd')}</span>
                        {daySchedules.length > 0 && (
                          <div className="flex gap-0.5">
                            {daySchedules.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                            ))}
                            {daySchedules.length > 3 && (
                              <span className="text-xs">+{daySchedules.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {selectedDate && daySchedules.length > 0 
                  ? `${daySchedules.length} ${daySchedules.length === 1 ? 'person' : 'people'} in office`
                  : 'No schedules'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDate ? (
                <>
                  {daySchedules.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No one scheduled for this day
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => {
                        const isOwnSchedule = schedule.userId === currentUser?.uid;
                        const isRoomAdmin = userRooms.find(r => r.id === selectedRoomId)?.memberRole === 'admin';
                        const canDelete = isOwnSchedule || isRoomAdmin;

                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="text-sm">
                                {schedule.user?.name || 'Unknown User'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {schedule.status === 'office' ? 'Office' : 'Remote'}
                              </span>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setDeleteScheduleId(schedule.id);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Dialog 
                    open={requestDialogOpen} 
                    onOpenChange={(open) => {
                      setRequestDialogOpen(open);
                      if (!open) {
                        setOriginalScheduleDate(undefined);
                        setNewScheduleDate(undefined);
                        setReason("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        data-testid="button-request-change"
                        onClick={() => {
                          if (userScheduleForDay) {
                            setOriginalScheduleDate(new Date(userScheduleForDay.date));
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Request Schedule Change
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Request Schedule Change</DialogTitle>
                        <DialogDescription>
                          Select the date you want to change and the new date you want to move to
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 pt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Date to Change FROM {originalScheduleDate && '✓'}
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Select the current office date you want to change
                            </p>
                            <Calendar
                              mode="single"
                              selected={originalScheduleDate}
                              onSelect={setOriginalScheduleDate}
                              className="rounded-md border"
                              data-testid="calendar-original-date"
                            />
                            {originalScheduleDate && (
                              <p className="text-xs text-center text-muted-foreground mt-2">
                                Selected: {format(originalScheduleDate, 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Date to Change TO {newScheduleDate && '✓'}
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Select the new date you want to work from office
                            </p>
                            <Calendar
                              mode="single"
                              selected={newScheduleDate}
                              onSelect={setNewScheduleDate}
                              className="rounded-md border"
                              data-testid="calendar-new-date"
                            />
                            {newScheduleDate && (
                              <p className="text-xs text-center text-muted-foreground mt-2">
                                Selected: {format(newScheduleDate, 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason (optional)</Label>
                          <Textarea
                            id="reason"
                            data-testid="textarea-reason"
                            placeholder="Why are you requesting this change?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button 
                          onClick={handleSubmitChange}
                          data-testid="button-submit-request"
                          className="w-full"
                          disabled={!newScheduleDate || !originalScheduleDate}
                        >
                          Submit Change Request
                        </Button>
                        {(!originalScheduleDate || !newScheduleDate) && (
                          <p className="text-xs text-center text-muted-foreground">
                            Please select both dates to submit your request
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Select a date to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Office Day</AlertDialogTitle>
              <AlertDialogDescription>
                {userRooms.find(r => r.id === selectedRoomId)?.memberRole === 'admin' 
                  ? "Are you sure you want to delete this office day? This action cannot be undone."
                  : "This will send a request to the admin to delete this office day. Please provide a reason:"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {userRooms.find(r => r.id === selectedRoomId)?.memberRole !== 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="delete-reason">Reason</Label>
                <Textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you want to delete this office day?"
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteScheduleId(null);
                setReason('');
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteScheduleId) {
                    const isAdmin = userRooms.find(r => r.id === selectedRoomId)?.memberRole === 'admin';
                    handleDeleteSchedule(deleteScheduleId, isAdmin);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {userRooms.find(r => r.id === selectedRoomId)?.memberRole === 'admin' ? 'Delete' : 'Request Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}