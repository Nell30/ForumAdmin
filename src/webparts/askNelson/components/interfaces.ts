export interface ISPList {
    Id: number;
    Created: string;
    Answers: string;
    Replies: string;
    Status: string;
    IsFavorite: boolean;
}

export enum SortOrder {
    Asc = 'asc',
    Desc = 'desc',
    Oldest = 'oldest',
    Newest = 'newest',
    Pending = 'pending',
    Approved = 'approved',
}