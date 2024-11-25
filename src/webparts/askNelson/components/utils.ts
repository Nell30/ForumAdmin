import { ISPList } from "./interfaces";

// utils.ts

export function sortAndFilterItems(items: ISPList[], sortOrder: string, filterStatus: string): ISPList[] {
  // Apply filter
  let filteredItems = items;
  if (filterStatus !== '') {
    switch (filterStatus) {
      case 'Favorite':
        filteredItems = items.filter(item => item.IsFavorite === true);
        break;
      case 'Under Review':
      case 'Approved':
        filteredItems = items.filter(item => item.Status === filterStatus);
        break;
      // Add more cases if needed
    }
  }

  // Sort the filtered items
  return filteredItems.sort((a, b) => {
    switch (sortOrder) {
      case 'asc':
        return a.Answers.toLowerCase().localeCompare(b.Answers.toLowerCase());
      case 'desc':
        return b.Answers.toLowerCase().localeCompare(a.Answers.toLowerCase());
      case 'oldest':
        return new Date(a.Created).getTime() - new Date(b.Created).getTime();
      case 'newest':
        return new Date(b.Created).getTime() - new Date(a.Created).getTime();
      case 'pending':
        return (a.Status === 'Under Review' ? -1 : 1) - (b.Status === 'Under Review' ? -1 : 1);
      case 'approved':
        return (a.Status === 'Approved' ? -1 : 1) - (b.Status === 'Approved' ? -1 : 1);
      case 'favorite':
        return (a.IsFavorite === true ? -1 : 1) - (b.IsFavorite === true ? -1 : 1);
      default:
        return 0;
    }
  });
}


export function renderPageNumbers(totalPages: number, currentPage: number, maxVisiblePages: number = 5): string {
  console.log(`Rendering Page Numbers - Current Page: ${currentPage}, Total Pages: ${totalPages}`);
  let pageNumbers = '';
  const halfVisible = Math.floor(maxVisiblePages / 2);

  let startPage = Math.max(currentPage - halfVisible, 1);
  let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

  if (totalPages <= 1) {
    return ''; // Don't render pagination if there's only one page or no pages
  }

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(endPage - maxVisiblePages + 1, 1);
  }

  if (startPage > 1) {
    pageNumbers += `<button class="page-number" data-page="1">1</button>`;
    if (startPage > 2) {
      pageNumbers += `<span class="ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers += `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers += `<span class="ellipsis">...</span>`;
    }
    pageNumbers += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
  }
  

  return pageNumbers;
}

