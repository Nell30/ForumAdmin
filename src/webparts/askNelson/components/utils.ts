import { ISPList } from "./interfaces";

export function sortItems(items: ISPList[], sortOrder: string): ISPList[] {
  return items.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.Answers.toLowerCase().localeCompare(b.Answers.toLowerCase());
    } else if (sortOrder === 'desc') {
      return b.Answers.toLowerCase().localeCompare(a.Answers.toLowerCase());
    } else if (sortOrder === 'oldest') {
      return new Date(a.Created).getTime() - new Date(b.Created).getTime();
    } else if (sortOrder === 'newest') {
      return new Date(b.Created).getTime() - new Date(a.Created).getTime();
    } else if (sortOrder === 'pending') {
      return a.Status === 'Under Review' ? -1 : 1;
    } else if (sortOrder === 'approved') {
      return a.Status === 'Approved' ? -1 : 1;
    } else {
      return 0;
    }
  });
}


export function renderPageNumbers(totalPages: number, currentPage: number): string {
  let pageNumbers = '';

  for (let i = 1; i <= totalPages; i++) {
    pageNumbers += `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  return pageNumbers;
}
