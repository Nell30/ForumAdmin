import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import styles from './AskNelsonWebPart.module.scss';
import { faCommentAlt } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { ISPList, SortOrder } from './components/interfaces';
import { sortItems, renderPageNumbers } from './components/utils';
import { SPComponentLoader } from '@microsoft/sp-loader';

library.add(faCommentAlt);

export default class AskNelsonWebPart extends BaseClientSideWebPart<{}> {
  private sortOrder: SortOrder = SortOrder.Newest;
  private currentPage = 1;
  private readonly itemsPerPage = 10;
  private items: any[] = []; // Declare and initialize the 'items' property as an empty array

  public onInit(): Promise<void> {
    console.log('onInit called', this);
    return super.onInit();
  }

  protected onDispose(): void {
    console.log('onDispose called', this);
    super.onDispose();
  }

  constructor() {
    super();
    SPComponentLoader.loadCss('https://maxcdn.bootstrapcdn.com/font-awesome/6.4.2/css/font-awesome.min.css');
  }
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
    const filteredItems = sortedItems.filter((item) => item.Status !== 'Rejected');
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

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
              <i class="fa-regular fa-calendar ${styles.calendarIcon}"></i>
              <span>${formattedTime}</span>
              <i class="fa-regular fa-clock class="${styles.calendarIcon}"></i>
              <div class="${styles.deleteIcon}" data-item-id="${item.Id}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                  <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                </svg>
                
              </div>
            </div>             
          </div>
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
                <i class="fa-solid fa-comment ${styles.commentIcon}"></i>

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

      const deleteIcons = this.domElement.querySelectorAll(`.${styles.deleteIcon}`);
      deleteIcons.forEach((deleteIcon) => {
        deleteIcon.addEventListener('click', this.handleDeleteItem.bind(this));
      });

    }
  }
  
  private renderArchive(items: ISPList[]): void {
    const rejectedItems = items.filter((item) => item.Status === 'Rejected');
  
    let html = '';
  
    if (rejectedItems.length === 0) {
      html = '<p>No archived items found.</p>';
    } else {
      rejectedItems.forEach((item: ISPList) => {
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
                  <i class="fa-regular fa-calendar ${styles.calendarIcon}"></i>
                  <span>${formattedTime}</span>
                  <i class="fa-regular fa-clock class="${styles.calendarIcon}"></i>
                  <div class="${styles.deleteIcon}" data-item-id="${item.Id}">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                
              </div>
                </div>             
              </div>
              
              <div class="${styles.itemReplies}">
  
                <div class="${styles.toggleContainer}">
                  <label class="${styles.switch}">
                    <input type="checkbox" data-item-id="${item.Id}" ${item.Status === 'Pending' ? 'checked' : ''}>
                    <span class="${styles.rejectedSlider} ${item.Status === 'Rejected' ? styles.rejectedSlider : ''}">
                    <span class="${item.Status === 'Pending' ? styles.underReviewStatus : styles.rejectedStatus}">${item.Status === 'Pending' ? 'Pending' : 'Rejected'}
                    </span>
                    </span>
                  </label>
                </div>
                                
                <div class="${styles.commentSection}">
                <i class="fa-solid fa-comment ${styles.commentIcon}"></i>

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
    const archiveContainer = this.domElement.querySelector('#archiveContainer');
    if (archiveContainer) {
      archiveContainer.innerHTML = html;
  
      const toggleSwitches = archiveContainer.querySelectorAll('input[type="checkbox"]');
      toggleSwitches.forEach((toggleSwitch) => {
        toggleSwitch.addEventListener('change', this.handleArchiveToggleChange.bind(this));
      });

      const deleteIcons = archiveContainer.querySelectorAll(`.${styles.deleteIcon}`);
      deleteIcons.forEach((deleteIcon) => {
        deleteIcon.addEventListener('click', this.handleDeleteItemList.bind(this));
      });
    }
  }

  private async handleDeleteItemList(event: Event): Promise<void> {
    const deleteIcon = event.target as HTMLElement;
    const itemId = deleteIcon.closest(`.${styles.deleteIcon}`)?.getAttribute('data-item-id');
  
    if (itemId && this.items) { // Check if 'this.items' is defined
      // Display warning before deleting
      const confirmDelete = confirm('Are you sure you want to delete this item?');
  
      if (confirmDelete) {
        try {
          // Find the index of the item in the array
          const itemIndex = this.items.findIndex(item => item.Id === parseInt(itemId));
  
          if (itemIndex !== -1) {
            // Remove the item from the array using splice
            this.items.splice(itemIndex, 1);
  
            // Refresh the list
            this.renderArchive(this.items);
          }
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Failed to delete item. Please try again.');
        }
      }
    }
  }
  

  private async handleArchiveToggleChange(event: Event): Promise<void> {
    const toggleSwitch = event.target as HTMLInputElement;
    const itemId = parseInt(toggleSwitch.getAttribute('data-item-id')!, 10);
    const newStatus = toggleSwitch.checked ? 'Under Review' : 'Rejected';
  
    await this.updateItemStatus(itemId, newStatus);
    const items = await this.getListData();
    this.renderArchive(items);
  }

  // Function to handle delete item
  private async handleDeleteItem(event: Event): Promise<void> {
    const deleteIcon = event.target as HTMLElement;
    const itemId = deleteIcon.closest(`.${styles.deleteIcon}`)?.getAttribute('data-item-id');

    if (itemId) {
      // Display warning before deleting
      const confirmDelete = confirm('Are you sure you want to delete this item?');

      if (confirmDelete) {
        try {
          // Update item status to "Rejected"
          await this.updateItemStatus(parseInt(itemId), 'Rejected');

          // Refresh the list
          const items = await this.getListData();
          this.renderList(items);
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Failed to delete item. Please try again.');
        }
      }
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
  if (this.context && this.context.pageContext && this.context.pageContext.web) {
    try {
      const response: SPHttpClientResponse = await this.context.spHttpClient.get(
        `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
        SPHttpClient.configurations.v1
      );

      if (!response.ok) {
        throw new Error(`Error retrieving list item: ${response.statusText}`);
      }

      const data: ISPList = await response.json();
      return data;
    } catch (error) {
      console.error('Error retrieving list item:', error);
      throw error;
    }
  } else {
    throw new Error('Context or page context is not available.');
  }
}

  public async render(): Promise<void> {

    if (!this || !this.domElement) {
      console.error('Component or DOM element is not available');
      return;
    }

    console.log('Render method called', this, this.domElement);
    
    this.getListData()
      .then((items) => {

        if (!this.domElement) {
          console.error('DOM element is no longer available');
          return;
        }
        
        const totalPages = Math.ceil(items.length / this.itemsPerPage);
  
        this.domElement.innerHTML = `
          <head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          </head>
          
          <header>
            <h1>Ask Ceo</h1>
            <div class="${styles.archiveLink}">
              <i class="fa-solid fa-box-archive"></i>
              <a href="#" id="archiveLink">Archive</a>
            </div>
          </header>
  
          <div class="${styles.searchBox}">
            <input type="text" placeholder="Search..." id="searchInput">
          </div>

          <div class="filterContainer">
            <div class="${styles.customSelect}">
              <select>
                <option value="${SortOrder.Newest}">Newest</option>
                <option value="${SortOrder.Oldest}">Oldest</option>               
                <option value="${SortOrder.Asc}">A-Z</option>
                <option value="${SortOrder.Desc}">Z-A</option>               
                <option value="${SortOrder.Pending}">Pending</option>
                <option value="${SortOrder.Approved}">Approved</option>
              </select>            
            </div>
          </div>
          
  
          <div id="archiveContainer" style="display: none;">
            <button id="backToListButton" class=${styles.backToListButton}>Back to List</button>
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
        
        
        const backToListButton = this.domElement.querySelector('#backToListButton');
        if (backToListButton) {
          backToListButton.addEventListener('click', () => {
            const archiveContainer = this.domElement.querySelector('#archiveContainer') as HTMLElement;
            const spListContainer = this.domElement.querySelector('#spListContainer') as HTMLElement;
            if (archiveContainer && spListContainer) {
              archiveContainer.style.display = 'none';
              spListContainer.style.display = 'block';
              this.renderList(items);
            }
          });
        }

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
        
        const archiveLink = this.domElement.querySelector('#archiveLink');
        if (archiveLink) {
          archiveLink.addEventListener('click', (event: Event) => {
            event.preventDefault();
            const archiveContainer = this.domElement.querySelector('#archiveContainer') as HTMLElement;
            const spListContainer = this.domElement.querySelector('#spListContainer') as HTMLElement;
            if (archiveContainer && spListContainer) {
              if (archiveContainer.style.display === 'none') {
                archiveContainer.style.display = 'block';
                spListContainer.style.display = 'none';
                this.renderArchive(items);
              } else {
                archiveContainer.style.display = 'none';
                spListContainer.style.display = 'block';
                this.renderList(items);
              }
            }
          });
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
        })
  
        
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
