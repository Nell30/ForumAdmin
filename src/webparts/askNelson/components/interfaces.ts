export interface ISPList {
    Id: number;
    Created: string;
    Answers: string;
    Better: string;
    Replies: string;
    Status: string;
}

export enum SortOrder {
    Asc = 'asc',
    Desc = 'desc',
    Oldest = 'oldest',
    Newest = 'newest',
    Pending = 'pending',
    Approved = 'approved',
}