import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import styles from './AskNelsonWebPart.module.scss';
import { faCommentAlt } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { ISPList, SortOrder } from './components/interfaces';
import { sortItems, renderPageNumbers } from './components/utils';

library.add(faCommentAlt);

const image: any= require('./assets/hospital.jpg');

export default class AskNelsonWebPart extends BaseClientSideWebPart<{}> {
  private sortOrder: SortOrder = SortOrder.Asc;
  private currentPage = 1;
  private readonly itemsPerPage = 10;

  private async getListData(): Promise<ISPList[]> {
    const response = await this.context.spHttpClient.get(
      `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items`,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`Error fetching list data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value;
  }

  private renderList(items: ISPList[]): void {
    const sortedItems = sortItems(items, this.sortOrder);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedItems = sortedItems.slice(startIndex, endIndex);

    let html = '';

    if (paginatedItems.length === 0) {
      html = '<p>No results found.</p>';
    } else {
           
    paginatedItems.forEach((item: ISPList) => {
      const createdDate = new Date(item.Created);
      const formattedDate = createdDate.toLocaleDateString();
      const formattedTime = createdDate.toLocaleTimeString();
      const replies = item.Replies ? item.Replies.split('\n') : []; 

      html += `
        <div class="${styles.listItem}">
          <div class="${styles.listpadding}">
            <div class="${styles.itemHeader}">              
              <h3 class="${styles.itemTitle}"><b class="${styles.itemTitle}">${item.Answers}</b></h3>           
              <div class="${styles.itemDate}">
                <span>${formattedDate}</span>
                <svg class=${styles.calendarIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M152 24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H64C28.7 64 0 92.7 0 128v16 48V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V192 144 128c0-35.3-28.7-64-64-64H344V24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H152V24zM48 192H400V448c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V192z"/></svg>
                <span>${formattedTime}</span>
                <svg class="${styles.calendarIcon}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
              </div>
            </div>
            <p class="${styles.itemDescription}">${item.Better}</p>
            <div class="${styles.itemReplies}">                   

            <div class="${styles.toggleContainer}">
              <label class="${styles.switch}">
                <input type="checkbox" data-item-id="${item.Id}" ${item.Status === 'Approved' ? 'checked' : ''}>
                <span class="${styles.slider}">
                <span class="${item.Status === 'Approved' ? styles.approvedStatus : styles.underReviewStatus}">${item.Status === 'Approved' ? 'Approved' : 'Pending'}
                </span>
                </span>
              </label>
            </div>

            
              <div class="${styles.commentSection}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="${styles.commentIcon}">
                  <path d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 2.7 466 2.2 466.5c-2.2 2.3-2.8 5.7-1.5 8.7S4.8 480 8 480c66.3 0 116-31.8 140.6-51.4 32.7 12.3 69 19.4 107.4 19.4 141.4 0 256-93.1 256-208S397.4 32 256 32z"/>
                </svg>
                <span class="${styles.replyCount}">${replies.length}</span>
              </div>
            </div>
            <div class="${styles.repliesContainer}">
            <ul class="${styles.replyList}">
              ${replies.map((reply, index) => `
                <li>
                  ${reply}
                    <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-item-id="${item.Id}" data-reply-index="${index}"></i>
                    <i class="fa-solid fa-trash ${styles.deleteReplyButton}" data-item-id="${item.Id}" data-reply-index="${index}"></i>
                  </li>
              `).join('')}
            </ul>
              
            <div class="${styles.replyForm}">
              <form data-id="${item.Id}" class="${styles.replyForm}">
                <div class="${styles.replyFormContainer}">
                  <textarea name="reply" placeholder="Enter your reply"></textarea>
                  <div class="${styles.buttonContainer}">                                   
                    <button type="submit">Submit Reply</button>
                  </div>
                </div>
              </form>
            </div>        
            </div>
          </div>
        </div>
      `;
    });
  }
    const spListContainer = this.domElement.querySelector('#spListContainer');
    if (spListContainer) {
      spListContainer.innerHTML = html;

      const replyForms = spListContainer.querySelectorAll(`.${styles.replyForm}`);
      replyForms.forEach((form) => {
        form.addEventListener('submit', this.handleReplySubmit.bind(this));
      });

      const commentIcons = spListContainer.querySelectorAll(`.${styles.itemReplies}`);
      commentIcons.forEach((icon) => {
        icon.addEventListener('click', () => {
          icon.classList.toggle(`${styles.active}`);
        });
      });

      const editReplyButtons = spListContainer.querySelectorAll(`.${styles.editReplyButton}`);
      editReplyButtons.forEach((button) => {
        button.addEventListener('click', this.handleEditReply.bind(this));
      });

      const deleteReplyButtons = spListContainer.querySelectorAll(`.${styles.deleteReplyButton}`);
      deleteReplyButtons.forEach((button) => {
        button.addEventListener('click', this.handleDeleteReply.bind(this));
      });

      const changeStatusButtons = spListContainer.querySelectorAll(`.${styles.changeStatusButton}`);
      changeStatusButtons.forEach((button) => {
        button.addEventListener('click', this.handleChangeStatus.bind(this));
      });

      const toggleSwitches = spListContainer.querySelectorAll('input[type="checkbox"]');
      toggleSwitches.forEach((toggleSwitch) => {
        toggleSwitch.addEventListener('change', this.handleToggleChange.bind(this));
      });

    }
  }


  private async handleToggleChange(event: Event): Promise<void> {
    const toggleSwitch = event.target as HTMLInputElement;
    const itemId = parseInt(toggleSwitch.getAttribute('data-item-id')!, 10);
    const newStatus = toggleSwitch.checked ? 'Approved' : 'Under Review';
  
    await this.updateItemStatus(itemId, newStatus);
    const items = await this.getListData();
    this.renderList(items);
  }

  private handleEditReply(event: Event): void {
    const button = event.target as HTMLButtonElement;
    const itemId = parseInt(button.getAttribute('data-item-id')!, 10);
    const replyIndex = parseInt(button.getAttribute('data-reply-index')!, 10);
  
    const replyItem = button.parentElement!;
    const replyText = replyItem.firstChild!.textContent!.trim();
  
    replyItem.innerHTML = `
      <input type="text" value="${replyText}" class="${styles.editReplyInput}">
      <div class="${styles.replyButtonsContainer}">
        <button class="${styles.saveReplyButton}">Save</button>
        <button class="${styles.cancelEditButton}">Cancel</button>
      </div>
    `;
  
    const saveReplyButton = replyItem.querySelector(`.${styles.saveReplyButton}`);
    saveReplyButton?.addEventListener('click', () => {
      const editReplyInput = replyItem.querySelector(`.${styles.editReplyInput}`) as HTMLInputElement;
      const updatedReplyText = editReplyInput.value;
  
      this.updateReply(itemId, replyIndex, updatedReplyText);
    });
  
    const cancelEditButton = replyItem.querySelector(`.${styles.cancelEditButton}`);
    cancelEditButton?.addEventListener('click', () => {
      replyItem.innerHTML = `
        ${replyText}
        <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-reply-index="${replyIndex}"></i>
       `;
      const editReplyButton = replyItem.querySelector(`.${styles.editReplyButton}`);
      editReplyButton?.addEventListener('click', this.handleEditReply.bind(this));
    });
  }
  
  private handleDeleteReply(event: Event): void {
    const button = event.target as HTMLButtonElement;
    const itemId = parseInt(button.getAttribute('data-item-id')!, 10);
    const replyIndex = parseInt(button.getAttribute('data-reply-index')!, 10);
  
    if (confirm('Are you sure you want to delete this reply?')) {
      this.deleteReply(itemId, replyIndex);
    }
  }
  
  private handleSearch(): void {
    const searchInput = this.domElement.querySelector('#searchInput') as HTMLInputElement;
    const searchTerm = searchInput.value.toLowerCase();
  
    this.getListData()
      .then((items) => {
        const filteredItems = items.filter((item) =>
          item.Answers.toLowerCase().includes(searchTerm)
        );
        this.renderList(filteredItems);
      })
      .catch((error) => {
        console.error('Error retrieving list data:', error);
      });
  }
  
  private async handleChangeStatus(event: Event): Promise<void> {
    const button = event.target as HTMLButtonElement;
    const itemId = parseInt(button.getAttribute('data-item-id')!, 10);

    // Find the specific item using the itemId
    const item = await this.getListItem(itemId);
    const newStatus = item.Status === 'Approved' ? 'Under Review' : 'Approved';


  
    await this.updateItemStatus(itemId, newStatus);
    const items = await this.getListData();
    this.renderList(items);
  }

  private async updateItemStatus(itemId: number, newStatus: string): Promise<void> {
    // Make an API call to update the item status in SharePoint
    // You can use the SPHttpClient to make the API request
    // Example:
    await this.context.spHttpClient.post(`${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`, 
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-type': 'application/json;odata=nometadata',
          'odata-version': '',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE',
        },
        body: JSON.stringify({
          Status: newStatus,
        }),
      }
    );
  }

  private async updateReply(itemId: number, replyIndex: number, updatedReplyText: string): Promise<void> {
    const listItem: ISPList = await this.getListItem(itemId);
  
    const replies = listItem.Replies ? listItem.Replies.split('\n') : [];
    replies[replyIndex] = updatedReplyText;
    const updatedReplies = replies.join('\n');
  
    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'IF-MATCH': '*',
            'X-HTTP-Method': 'MERGE',
          },
          body: JSON.stringify({
            Replies: updatedReplies,
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating reply:', errorData);
        throw new Error(`Error updating reply: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating reply:', error);
      throw new Error('Error updating reply');
    }
  
    const items = await this.getListData();
    this.renderList(items);
  }


  private async handleReplySubmit(event: Event): Promise<void> {
    event.preventDefault();
  
    const form = event.target as HTMLFormElement;
    const itemId = form.getAttribute('data-id');
    const replyTextarea = form.querySelector('textarea[name="reply"]') as HTMLTextAreaElement;
    const replyText = replyTextarea.value;

    if (itemId && replyText) {
      try {
        await this.submitReply(parseInt(itemId, 10), replyText, status);
        alert('Reply submitted successfully');
        const items = await this.getListData();
        this.renderList(items);
      } catch (error) {
        console.error('Error submitting reply:', error);
        alert('Failed to submit reply. Please try again.');
      }
    }
  }
  
  private async submitReply(itemId: number, replyText: string, status: string): Promise<void> {
    const listItem: ISPList = await this.getListItem(itemId);

    const existingReplies = listItem.Replies ? listItem.Replies.split('\n') : [];
    const updatedReplies = [...existingReplies, replyText].join('\n');

    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'IF-MATCH': '*',
            'X-HTTP-Method': 'MERGE',
          },
          body: JSON.stringify({
            Replies: updatedReplies,
            Status: status,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error submitting reply:', errorData);
        throw new Error(`Error submitting reply: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      throw new Error('Error submitting reply');
    }
  }

  private async deleteReply(itemId: number, replyIndex: number): Promise<void> {
    const listItem: ISPList = await this.getListItem(itemId);
  
    const replies = listItem.Replies ? listItem.Replies.split('\n') : [];
    replies.splice(replyIndex, 1);
    const updatedReplies = replies.join('\n');
  
    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.post(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'Content-type': 'application/json;odata=nometadata',
            'odata-version': '',
            'IF-MATCH': '*',
            'X-HTTP-Method': 'MERGE',
          },
          body: JSON.stringify({
            Replies: updatedReplies,
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting reply:', errorData);
        throw new Error(`Error deleting reply: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw new Error('Error deleting reply');
    }
  
    const items = await this.getListData();
    this.renderList(items);
  }
  

  private async getListItem(itemId: number): Promise<ISPList> {
    const response: SPHttpClientResponse = await this.context.spHttpClient.get(
      `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`Error retrieving list item: ${response.statusText}`);
    }

    const data: ISPList = await response.json();
    return data;
  }

  public render(): void {
    this.getListData()
      .then((items) => {
        const totalPages = Math.ceil(items.length / this.itemsPerPage);

        this.domElement.innerHTML = `
          <head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          </head>
          <img src="${image}">
          <header>
            <h1>Safe Space</h1>
          </header>
          <div class="filterContainer">
            <div class="${styles.customSelect}">
              <select>
                <option value="">Sort By</option>
                <option value="${SortOrder.Asc}">A-Z</option>
                <option value="${SortOrder.Desc}">Z-A</option>
                <option value="${SortOrder.Oldest}">Oldest</option>
                <option value="${SortOrder.Newest}">Newest</option>
                <option value="${SortOrder.Pending}">Pending</option>
                <option value="${SortOrder.Approved}">Approved</option>
              </select>            
            </div>

            <div class="${styles.searchBox}">
              <input type="text" placeholder="Search..." id="searchInput">
            </div>
          </div>

          <div id="spListContainer"></div>

          <div class="${styles.pagination}">
            <ul>
              <a class="prev-button">&lt;</a>
              ${renderPageNumbers(totalPages, this.currentPage)}
              <a class="next-button">&gt;</a>
            </ul>
          </div>
        `;

        this.renderList(items);

        const sortSelect = this.domElement.querySelector('select');
        if (sortSelect) {
          sortSelect.addEventListener('change', (event: Event) => {
            this.sortOrder = (event.target as HTMLSelectElement).value as SortOrder;
            this.currentPage = 1;
            this.renderList(items);
          });
        }
        
        const searchInput = this.domElement.querySelector('#searchInput');
        if (searchInput) {
          searchInput.addEventListener('input', this.handleSearch.bind(this));
        }

        const prevButton = this.domElement.querySelector('.prev-button');
        const nextButton = this.domElement.querySelector('.next-button');

        prevButton?.addEventListener('click', () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.renderList(items);
            this.updateActiveButton();
          }
        });

        nextButton?.addEventListener('click', () => {
          if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderList(items);
            this.updateActiveButton();
          }
        });

        
        const pageNumbers = this.domElement.querySelectorAll('.page-number');
        pageNumbers.forEach((pageNumber) => {
          // Apply CSS styles to the page number element
          (pageNumber as HTMLElement).style.color = '#333';
          (pageNumber as HTMLElement).style.backgroundColor = '#fff';
          (pageNumber as HTMLElement).style.border = '1px solid #ddd';
          (pageNumber as HTMLElement).style.padding = '8px 16px';
          (pageNumber as HTMLElement).style.margin = '0 4px';
          (pageNumber as HTMLElement).style.borderRadius = '4px';
          (pageNumber as HTMLElement).style.cursor = 'pointer';

          // Add hover styles
          (pageNumber as HTMLElement).addEventListener('mouseover', () => {
            if (!(pageNumber as HTMLElement).classList.contains('active')) {
              (pageNumber as HTMLElement).style.backgroundColor = '#f5f5f5';
            }
          });

          // Remove hover styles
          (pageNumber as HTMLElement).addEventListener('mouseout', () => {
            if (!(pageNumber as HTMLElement).classList.contains('active')) {
              (pageNumber as HTMLElement).style.backgroundColor = '#fff';
            }
          });

          pageNumber.addEventListener('click', (event: Event) => {
            const selectedPage = parseInt((event.target as HTMLButtonElement).getAttribute('data-page')!, 10);
            this.currentPage = selectedPage;
            this.renderList(items);
            this.updateActiveButton();
          });
        });

        this.updateActiveButton();
      })
      .catch((error) => {
        console.error('Error retrieving list data:', error);
      });
  }

  private updateActiveButton() {
    const pageNumbers = this.domElement.querySelectorAll('.page-number');
    pageNumbers.forEach((pageNumber) => {
      if (parseInt((pageNumber as HTMLElement).getAttribute('data-page')!, 10) === this.currentPage) {
        (pageNumber as HTMLElement).classList.add('active');
        (pageNumber as HTMLElement).style.backgroundColor = '#637064';
        (pageNumber as HTMLElement).style.color = '#fff';
      } else {
        (pageNumber as HTMLElement).classList.remove('active');
        (pageNumber as HTMLElement).style.backgroundColor = '#fff';
        (pageNumber as HTMLElement).style.color = '#333';
      }
    });
  }


  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
