import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ref, push, set, get, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Check, Users, Crown, UserPlus, Settings } from "lucide-react";
import type { Room, RoomMember, User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function RoomsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [userRooms, setUserRooms] = useState<(Room & { memberRole: string, memberStatus: string })[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomMembers, setRoomMembers] = useState<(RoomMember & { user: User })[]>([]);

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
        ([_, member]: any) => member.userId === currentUser.id
      );

      const roomsData = await Promise.all(
        userMemberEntries.map(async ([_, member]: any) => {
          const roomSnapshot = await get(ref(database, `rooms/${member.roomId}`));
          if (roomSnapshot.exists()) {
            return { 
              ...roomSnapshot.val(), 
              memberRole: member.role,
              memberStatus: member.status
            };
          }
          return null;
        })
      );

      setUserRooms(roomsData.filter(Boolean));
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedRoom) return;

    const membersRef = ref(database, 'roomMembers');
    const unsubscribe = onValue(membersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setRoomMembers([]);
        return;
      }

      const members = snapshot.val();
      const roomMemberEntries = Object.entries(members).filter(
        ([_, member]: any) => member.roomId === selectedRoom
      );

      const membersWithUsers = await Promise.all(
        roomMemberEntries.map(async ([id, member]: any) => {
          const userSnapshot = await get(ref(database, `users/${member.userId}`));
          return { ...member, id, user: userSnapshot.val() };
        })
      );

      setRoomMembers(membersWithUsers);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async () => {
    if (!currentUser || !roomName.trim()) return;

    try {
      const roomsRef = ref(database, 'rooms');
      const newRoomRef = push(roomsRef);
      const code = generateInviteCode();

      const newRoom: Room = {
        id: newRoomRef.key!,
        name: roomName.trim(),
        createdBy: currentUser.id,
        createdAt: Date.now(),
        inviteCode: code,
      };

      await set(newRoomRef, newRoom);

      const memberRef = push(ref(database, 'roomMembers'));
      const newMember: RoomMember = {
        id: memberRef.key!,
        roomId: newRoom.id,
        userId: currentUser.id,
        role: 'admin',
        status: 'active',
        createdAt: Date.now(),
      };

      await set(memberRef, newMember);

      toast({
        title: "Room created",
        description: `${roomName} has been created successfully`,
      });

      setCreateDialogOpen(false);
      setRoomName("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create room. Please try again.",
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!currentUser || !inviteCode.trim()) return;

    try {
      const roomsSnapshot = await get(ref(database, 'rooms'));
      if (!roomsSnapshot.exists()) {
        throw new Error("Room not found");
      }

      const rooms = roomsSnapshot.val();
      const roomEntry = Object.entries(rooms).find(
        ([_, room]: any) => room.inviteCode === inviteCode.trim().toUpperCase()
      );

      if (!roomEntry) {
        throw new Error("Invalid invite code");
      }

      const [roomId, room] = roomEntry as [string, Room];

      const membersSnapshot = await get(ref(database, 'roomMembers'));
      if (membersSnapshot.exists()) {
        const members = membersSnapshot.val();
        const alreadyMember = Object.values(members).some(
          (member: any) => member.roomId === roomId && member.userId === currentUser.id
        );

        if (alreadyMember) {
          throw new Error("You are already a member of this room");
        }
      }

      const memberRef = push(ref(database, 'roomMembers'));
      const newMember: RoomMember = {
        id: memberRef.key!,
        roomId,
        userId: currentUser.id,
        role: 'member',
        status: 'pending',
        createdAt: Date.now(),
      };

      await set(memberRef, newMember);

      toast({
        title: "Request sent",
        description: "Your request to join the room has been sent to the admin",
      });

      setJoinDialogOpen(false);
      setInviteCode("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not join room. Please try again.",
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied",
      description: "Invite code copied to clipboard",
    });
  };

  const handleApproveJoinRequest = async (memberId: string) => {
    try {
      await update(ref(database, `roomMembers/${memberId}`), { status: 'active' });
      toast({
        title: "Approved",
        description: "Member has been approved",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not approve member",
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

  if (!currentUser) return null;

  const activeRooms = userRooms.filter(r => r.memberStatus === 'active');
  const pendingRooms = userRooms.filter(r => r.memberStatus === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your office spaces and teams
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-join-room">
                <UserPlus className="w-4 h-4 mr-2" />
                Join Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Room</DialogTitle>
                <DialogDescription>
                  Enter the invite code provided by your team admin
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    data-testid="input-invite-code"
                    placeholder="ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </div>
                <Button 
                  onClick={handleJoinRoom} 
                  data-testid="button-submit-join"
                  className="w-full"
                  disabled={!inviteCode.trim()}
                >
                  Join Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-room">
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Room</DialogTitle>
                <DialogDescription>
                  Set up a room for your team or office location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    data-testid="input-room-name"
                    placeholder="Main Office"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateRoom} 
                  data-testid="button-submit-create"
                  className="w-full"
                  disabled={!roomName.trim()}
                >
                  Create Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Requests</CardTitle>
            <CardDescription>Waiting for admin approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-muted-foreground">Request pending</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeRooms.length === 0 && pendingRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create a room to start managing your team's office schedule or join an existing room with an invite code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {activeRooms.map((room) => (
            <Card key={room.id} data-testid={`room-card-${room.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {room.name}
                      {room.memberRole === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {room.memberRole === 'admin' ? 'Admin' : 'Member'}
                    </CardDescription>
                  </div>
                  {room.memberRole === 'admin' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-room-settings-${room.id}`}
                      onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Invite Code</p>
                    <code className="text-sm font-mono font-semibold">{room.inviteCode}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`button-copy-code-${room.id}`}
                    onClick={() => handleCopyCode(room.inviteCode)}
                  >
                    {copiedCode === room.inviteCode ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {selectedRoom === room.id && room.memberRole === 'admin' && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3">Members ({roomMembers.length})</h4>
                      <div className="space-y-2">
                        {roomMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {member.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{member.user?.name}</p>
                                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                {member.role}
                              </Badge>
                              {member.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    data-testid={`button-approve-${member.id}`}
                                    onClick={() => handleApproveJoinRequest(member.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-reject-${member.id}`}
                                    onClick={() => handleRejectJoinRequest(member.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
