// Database
export interface Image {
  id: number | null;
  url: string | null;
  publicId: string | null;
  type: string | null;
}

export interface Sound {
  id: number | null;
  url: string | null;
  path: string | null;
  type: string | null;
}

interface Role {
  id: number;
  name: string;
}

export interface Tag {
  id: number | null;
  name: string | null;
}

// Member
interface Member {
  id: number;
  name: string;
  username: string;
  userId: string;
  role: RoleEntry | null;
  description: string | null;
  images: ImageMemberEntry | null;
  sound: Omit<Sound, "id"> | null;
  tags: Tag[];
  github: string | null;
  phrase: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  hidden: boolean;
  createdAt: string;
  projectsCount: number;
  commentsCount: number;
  collaborationsCount: number;
}


export interface TagMemberEntry extends Tag {
  memberId: number | null;
}

export interface ImageMemberEntry {
  avatar: Pick<Image, 'url' | 'publicId'>
  banner: Pick<Image, 'url' | 'publicId'>
}

export interface SoundMemberEntry extends sound {
  memberId: number;
}


// User
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  image: string;
  banner: string;
  bannerColor: string
  createdAt: string;
  updatedAt: string;
}

// Project
export interface project {
  id: number;
  title: string;
  description: string | null;
  repository: string | null;
  url: string | null;
  hidden: boolean;
  createdAt: string
  updateAt: string;
  tags: Tag[];
  creator: Pick<User, 'id', 'name', 'username', 'image'>;
}

export type ProjectEntry = Omit<Project, 'createdAt', 'updatedAt'>

export interface ProjectMemberEntry {
  id: number;
  name: string;
  projectId: number | null;
}

export interface TagProjectEntry extends Tag {
  projectId: number | null;
}

export interface ImageProjectEntry extends Omit<Image, "id"> {
  projectId: number | null;
}


export interface TopLevelCommentResponse {
  id: number;
  author: { username: string; avatar: string };
  content: string;
  parentId: null;
  replies: ReplyCommentResponse[];
}

export interface ReplyCommentResponse {
  id: number;
  author: { username: string; avatar: string };
  content: string;
  parentId: number;
  replyTo?: string;
}

export type CommentResponse = TopLevelCommentResponse | ReplyCommentResponse;
