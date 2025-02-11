export interface projectEntry {
  id: number;
  title: string;
  description: string | null;
  repository: string | null;
  url: string | null;
  image: string | null;
  publicId: string;
  creator: Pick<emberEntry, "id", "name", "username", "iamge">;
}

export interface projectMemberEntry {
  id: number;
  name: string;
  projectId: number | null;
}

interface memberEntry {
  id: number;
  name: string;
  username: string;
  role: roleEntry | null;
  description: string | null;
  image: string | null;
  soundUrl: string | null;
  soundPath: string | null;
  publicId: string | null;
  banner: string | null;
  github: string | null;
  phrase: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: string;
}

interface roleEntry {
  id: number;
  name: string;
}

// Tags
export interface tagEntry {
  id: number | null;
  name: string | null;
}

export interface tagMemberEntry extends tagEntry {
  memberId: number | null;
}

export interface tagProjectEntry extends tagEntry {
  projectId: number | null;
}