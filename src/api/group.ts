import type { ResponseData } from '@/api/types'
import { envelope, http, results } from '@/lib/http'

/**
 * `/user/my/groups` and `/group/info` return whatsmeow `types.GroupInfo`,
 * serialized with Go field names (PascalCase, no json tags) — unlike the other
 * `/group/*` endpoints below, which use the snake_case domain structs.
 */
export interface MyGroupParticipant {
  JID: string
  PhoneNumber: string
  LID?: string
  DisplayName?: string
  IsAdmin: boolean
  IsSuperAdmin: boolean
}

export interface MyGroup {
  JID: string
  OwnerJID: string
  Name: string
  Topic?: string
  GroupCreated: string
  ParticipantCount: number
  Participants: MyGroupParticipant[]
  IsLocked?: boolean
  IsAnnounce?: boolean
  IsEphemeral?: boolean
}

/** The full `types.GroupInfo`: everything `/user/my/groups` returns, plus the rest. */
export interface GroupInfo extends MyGroup {
  OwnerPN?: string
  NameSetAt?: string
  TopicSetAt?: string
  TopicDeleted?: boolean
  DisappearingTimer?: number
  IsIncognito?: boolean
  IsParent?: boolean
  LinkedParentJID?: string
  IsDefaultSubGroup?: boolean
  IsJoinApprovalRequired?: boolean
  AddressingMode?: string
  CreatorCountryCode?: string
  MemberAddMode?: string
  Suspended?: boolean
}

export interface GroupIdResult {
  group_id: string
}

export interface GroupParticipant {
  jid: string
  phone_number: string
  lid?: string
  display_name?: string
  is_admin: boolean
  is_super_admin: boolean
}

export interface GroupParticipantsResult {
  group_id: string
  name: string
  participants: GroupParticipant[]
}

export interface ParticipantRequestEntry {
  jid: string
  phone_number: string
  display_name?: string
  requested_at: string
}

export interface ParticipantStatus {
  participant: string
  status: string
  message: string
}

export interface GroupInfoFromLink {
  group_id: string
  name: string
  topic: string
  created_at: string
  participant_count: number
  is_locked: boolean
  is_announce: boolean
  is_ephemeral: boolean
  description: string
}

export interface GroupInviteLink {
  invite_link: string
  group_id: string
}

export interface SetGroupPhotoResult {
  picture_id: string
  message: string
}

export interface ParticipantsPayload {
  group_id: string
  participants: string[]
}

export async function listMyGroups(): Promise<MyGroup[]> {
  const response = await results<{ data: MyGroup[] | null }>(http.get('/user/my/groups'))
  return response?.data ?? []
}

export function createGroup(payload: {
  title: string
  participants: string[]
}): Promise<GroupIdResult> {
  return results(http.post('/group', payload))
}

export function joinGroupWithLink(payload: { link: string }): Promise<GroupIdResult> {
  return results(http.post('/group/join-with-link', payload))
}

export async function leaveGroup(payload: { group_id: string }): Promise<void> {
  await http.post('/group/leave', payload)
}

export function getGroupInfo(payload: { group_id: string }): Promise<GroupInfo> {
  return results(http.get('/group/info', { params: payload }))
}

export function getGroupInfoFromLink(payload: { link: string }): Promise<GroupInfoFromLink> {
  return results(http.get('/group/info-from-link', { params: payload }))
}

export function listParticipants(payload: { group_id: string }): Promise<GroupParticipantsResult> {
  return results(http.get('/group/participants', { params: payload }))
}

export function addParticipants(payload: ParticipantsPayload): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participants', payload))
}

export function removeParticipants(payload: ParticipantsPayload): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participants/remove', payload))
}

export function promoteParticipants(payload: ParticipantsPayload): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participants/promote', payload))
}

export function demoteParticipants(payload: ParticipantsPayload): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participants/demote', payload))
}

export async function listParticipantRequests(payload: {
  group_id: string
}): Promise<ParticipantRequestEntry[]> {
  return (
    (await results<ParticipantRequestEntry[]>(
      http.get('/group/participant-requests', { params: payload }),
    )) ?? []
  )
}

export function approveParticipantRequests(
  payload: ParticipantsPayload,
): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participant-requests/approve', payload))
}

export function rejectParticipantRequests(
  payload: ParticipantsPayload,
): Promise<ParticipantStatus[]> {
  return results(http.post('/group/participant-requests/reject', payload))
}

export function setGroupPhoto(payload: {
  group_id: string
  photo?: File
}): Promise<SetGroupPhotoResult> {
  const data = new FormData()
  data.append('group_id', payload.group_id)
  if (payload.photo) data.append('photo', payload.photo)
  return results(http.post('/group/photo', data))
}

export function setGroupName(payload: {
  group_id: string
  name: string
}): Promise<ResponseData<unknown>> {
  return envelope(http.post('/group/name', payload))
}

export function setGroupTopic(payload: {
  group_id: string
  topic: string
}): Promise<ResponseData<unknown>> {
  return envelope(http.post('/group/topic', payload))
}

export function setGroupLocked(payload: {
  group_id: string
  locked: boolean
}): Promise<ResponseData<unknown>> {
  return envelope(http.post('/group/locked', payload))
}

export function setGroupAnnounce(payload: {
  group_id: string
  announce: boolean
}): Promise<ResponseData<unknown>> {
  return envelope(http.post('/group/announce', payload))
}

export function getGroupInviteLink(payload: {
  group_id: string
  reset?: boolean
}): Promise<GroupInviteLink> {
  const params: Record<string, string | boolean> = { group_id: payload.group_id }
  if (payload.reset) params.reset = true
  return results(http.get('/group/invite-link', { params }))
}
