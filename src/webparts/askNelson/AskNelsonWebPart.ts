import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import styles from './AskNelsonWebPart.module.scss';
import { faCommentAlt } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { ISPList, SortOrder } from './components/interfaces';
import { renderPageNumbers, sortAndFilterItems } from './components/utils';
import { SPComponentLoader } from '@microsoft/sp-loader';


library.add(faCommentAlt);

export default class AskNelsonWebPart extends BaseClientSideWebPart<{}> {
  private sortOrder: SortOrder = SortOrder.Newest;
  private currentPage = 1;
  private currentArchivePage: number = 1;
  private readonly itemsPerPage = 10;
  private mainListItems: ISPList[] = [];
  private archivedItems: ISPList[] = [];
  private currentFilter: string = '';

  public async onInit(): Promise<void> {
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
      `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items?$top=5000`,
      SPHttpClient.configurations.v1
    );
  
    if (!response.ok) {
      throw new Error(`Error fetching list data: ${response.statusText}`);
    }
  
    const data = await response.json();
    const allItems: ISPList[] = data.value;
    console.log(`getListData: Fetched ${allItems.length} total items`);
    
    return allItems;
  }

  private renderList(items: ISPList[]): void {
    console.log(`Rendering List - Current Page: ${this.currentPage}`);
    console.log(`renderList called with ${items.length} items`);
    const sortedAndFilteredItems = sortAndFilterItems(items, this.sortOrder, this.currentFilter);
    const totalPages = Math.ceil(sortedAndFilteredItems.length / this.itemsPerPage);
    // Ensure current page is not greater than total pages
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedItems = sortedAndFilteredItems.slice(startIndex, endIndex);

    let html = '';
    
    if (paginatedItems.length === 0) {
      html = '<p>No results found.</p>';
    } else {
    
      
    paginatedItems.forEach((item: ISPList) => {
      const createdDate = new Date(item.Created);
      const formattedDate = createdDate.toLocaleDateString();
      const formattedTime = createdDate.toLocaleTimeString();
      //const replies = item.Replies ? item.Replies.split('\n') : [];
      const replies = item.Replies ? [item.Replies] : [];
      const pendingCount = items.filter(item => item.Status === 'Under Review').length;
      const approvedCount = items.filter(item => item.Status === 'Approved').length;
      const starIconClass = item.IsFavorite ? 'fa-solid' : 'fa-regular';
      const starIconColor = item.IsFavorite ? 'color: gold;' : '';
      this.renderStatusChart(pendingCount, approvedCount); 

      html += `
        <div class="${styles.listItem}">
          <div class="${styles.listpadding}">
          <div class="${styles.itemHeader}">              
            <h3 class="${styles.itemTitle}">Q: <b class="${styles.itemTitle}">${item.Answers}</b></h3>
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
              <i class="fa-star ${starIconClass} ${styles.starIcon}" data-item-id="${item.Id}" style="${starIconColor}"></i>

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

            <br>

            
              <div class="${styles.commentSection}">
              <i class="fa-solid fa-comment ${styles.commentIcon}"></i>
              
              <span class="${styles.replyCount}">${replies.length}</span>
              <span class="${styles.commentTooltip}">Click to collapse</span>

            </div>
            </div>
            <br>
            <div class="${styles.repliesContainer}">
            <hr>
            <ul class="${styles.replyList}">
              ${replies.map((reply, index) => `
                <li>
                   <pre class="${styles.preText}">${reply}</pre>
                    <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-item-id="${item.Id}" data-reply-index="${index}"></i>
                    <i class="fa-solid fa-trash ${styles.deleteReplyButton}" data-item-id="${item.Id}" data-reply-index="${index}"></i>
                  </li>
              `).join('')}
            </ul>
              
             ${replies.length === 0 ? `
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
            ` : ''}        
            </div>
          </div>
        </div>
      `;
    });
  }
    this.mainListItems = items;
    const spListContainer = this.domElement.querySelector('#spListContainer') as HTMLElement;
    if (spListContainer) {
      spListContainer.innerHTML = html;
      spListContainer.style.display = 'block'; // Ensure the main list is visible

      // Inside the render method, after rendering the list
      const starIcons = this.domElement.querySelectorAll(`.${styles.starIcon}`);
      starIcons.forEach((starIcon) => {
        starIcon.addEventListener('click', this.handleStarClick.bind(this));
      });

      const replyForms = spListContainer.querySelectorAll(`.${styles.replyForm}`);
      replyForms.forEach((form) => {
        form.addEventListener('submit', this.handleReplySubmit.bind(this));
      });

      const commentIcons = spListContainer.querySelectorAll(`.${styles.commentSection}`);
      commentIcons.forEach((icon) => {
        icon.addEventListener('click', (event) => {
          event.preventDefault(); // Prevent any default action
          event.stopPropagation(); // Stop the event from bubbling up

          if (icon instanceof HTMLElement) {
            const listItem = icon.closest(`.${styles.listItem}`);
            if (listItem instanceof HTMLElement) {
              const repliesContainer = listItem.querySelector(`.${styles.repliesContainer}`);
              if (repliesContainer instanceof HTMLElement) {
                const isHidden = repliesContainer.classList.toggle('hidden');
                console.log('Toggled hidden class:', isHidden);
                icon.classList.toggle(`${styles.active}`);

                // Force a reflow to ensure the transition takes effect
                void repliesContainer.offsetWidth;

                if (isHidden) {
                  repliesContainer.style.maxHeight = '0px';
                } else {
                  repliesContainer.style.maxHeight = `${repliesContainer.scrollHeight}px`;
                }
              }
            }
          }
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

      // const toggleSwitches = spListContainer.querySelectorAll('.status-toggle');
      // toggleSwitches.forEach((toggleSwitch) => {
      //   toggleSwitch.addEventListener('change', this.handleToggleChange.bind(this));
      // });

      const deleteIcons = this.domElement.querySelectorAll(`.${styles.deleteIcon}`);
      deleteIcons.forEach((deleteIcon) => {
        deleteIcon.addEventListener('click', this.handleDeleteItem.bind(this));
      });
    }
    const spPagination = this.domElement.querySelector('#spPagination .page-numbers');
    if (spPagination) {
        const sortedAndFilteredItems = sortAndFilterItems(this.mainListItems, this.sortOrder, this.currentFilter);
        this.setupPagination(spPagination, sortedAndFilteredItems, false);
    }
  }

    private renderStatusChart(underReviewCount: number, approvedCount: number): void {
    const total = underReviewCount + approvedCount;
    const approvedPercentage = (approvedCount / total) * 100;
    const underReviewPercentage = 100 - approvedPercentage;

    // Calculate the stroke-dasharray and stroke-dashoffset for both segments
    const circumference = 2 * Math.PI * 25; // 25 is the radius of the circle
    const approvedDash = (approvedPercentage / 100) * circumference;
    const underReviewDash = (underReviewPercentage / 100) * circumference;

    const chartHtml = `
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="25" fill="transparent" stroke="#ff6700" stroke-width="5"
                stroke-dasharray="${underReviewDash} ${circumference}"
                stroke-dashoffset="0"
                transform="rotate(-90 30 30)" />
        <circle cx="30" cy="30" r="25" fill="transparent" stroke="#4CAF50" stroke-width="5"
                stroke-dasharray="${approvedDash} ${circumference}"
                stroke-dashoffset="${-underReviewDash}"
                transform="rotate(-90 30 30)" />
        <text x="30" y="30" text-anchor="middle" dy=".3em" font-size="14">${total}</text>
      </svg>
      <div class="${styles.chartLegend}">
        <span class="${styles.underReviewLegend}">Under Review: ${underReviewCount}</span>
        <span class="${styles.approvedLegend}">Approved: ${approvedCount}</span>
      </div>
    `;

    const chartContainer = this.domElement.querySelector('#statusChart');
    if (chartContainer) {
      chartContainer.innerHTML = chartHtml;
    }
  }
  
  
  //Function to handle delete item
  private async handleDeleteItem(event: Event): Promise<void> {
    const deleteIcon = event.target as HTMLElement;
    const itemId = deleteIcon.closest(`.${styles.deleteIcon}`)?.getAttribute('data-item-id');
  
    if (itemId) {
      const confirmDelete = confirm('Are you sure you want to delete this item?');
  
      if (confirmDelete) {
        try {
          // Update item status to "Rejected"
          await this.updateItemStatus(parseInt(itemId), 'Rejected');
  
          // Refresh both main and archive lists
          const items = await this.getListData();
          const mainListItems = items.filter(item => item.Status !== 'Rejected');
          const archivedItems = items.filter(item => item.Status === 'Rejected');
          
          this.renderList(mainListItems);
          this.renderArchive(archivedItems);
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Failed to delete item. Please try again.');
        }
      }
    }
  }
  
  private async handleDeleteItemList(event: Event): Promise<void> {
    event.stopPropagation(); // Prevent event bubbling
    
    const target = event.target as HTMLElement;
    const deleteIcon = target.closest(`.${styles.deleteIcon}`) as HTMLElement;
    
    if (!deleteIcon) return; // Exit if the click wasn't on a delete icon
    
    const itemId = deleteIcon.getAttribute('data-item-id');
  
    if (itemId) {
      const confirmDelete = confirm('Are you sure you want to delete this item?');
  
      if (confirmDelete) {
        try {
          // Delete the item
          await this.deleteItem(parseInt(itemId));
  
          // Refresh the archive list
          const items = await this.getListData();
          const archivedItems = items.filter(item => item.Status === 'Rejected');
          this.renderArchive(archivedItems);
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Failed to delete item. Please try again.');
        }
      }
    }
  }

    private async deleteItem(itemId: number): Promise<void> {
        const response = await this.context.spHttpClient.post(
            `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items(${itemId})`,
            SPHttpClient.configurations.v1,
            {
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'Content-type': 'application/json;odata=nometadata',
                    'odata-version': '',
                    'IF-MATCH': '*',
                    'X-HTTP-Method': 'DELETE'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Error deleting item: ${response.statusText}`);
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

  // private async handleToggleChange(event: Event): Promise<void> {
  //   event.stopPropagation(); // Prevent event from bubbling up
  //   const toggleSwitch = event.target as HTMLInputElement;
  //   const itemId = parseInt(toggleSwitch.getAttribute('data-item-id')!, 10);
  //   const newStatus = toggleSwitch.checked ? 'Approved' : 'Under Review';
  
  //   try {
  //     await this.updateItemStatus(itemId, newStatus);
  //     const items = await this.getListData();
  //     this.renderList(items);
  //   } catch (error) {
  //     console.error('Error updating item status:', error);
  //     // Revert the toggle if there was an error
  //     toggleSwitch.checked = !toggleSwitch.checked;
  //   }
  // }

  // private handleEditReply(event: Event): void {
  //   const button = event.target as HTMLButtonElement;
  //   const itemId = parseInt(button.getAttribute('data-item-id')!, 10);
  //   const replyIndex = parseInt(button.getAttribute('data-reply-index')!, 10);
  
  //   const replyItem = button.parentElement!;
  //   const replyText = replyItem.firstChild!.textContent!.trim();
  
  //   replyItem.innerHTML = `
  //   <textarea class="${styles.editReplyInput}" style="width: 90%; min-height: 100px; padding: 8px; margin-bottom: 10px;">${replyText}</textarea>
  //     <div class="${styles.replyButtonsContainer}">
  //       <button class="${styles.saveReplyButton}">Save</button>
  //       <button class="${styles.cancelEditButton}">Cancel</button>
  //     </div>
  //   `;
  
  //   const saveReplyButton = replyItem.querySelector(`.${styles.saveReplyButton}`);
  //   saveReplyButton?.addEventListener('click', () => {
  //     const editReplyInput = replyItem.querySelector(`.${styles.editReplyInput}`) as HTMLInputElement;
  //     const updatedReplyText = editReplyInput.value;
  
  //     this.updateReply(itemId, replyIndex, updatedReplyText);
  //   });
  
  //   const cancelEditButton = replyItem.querySelector(`.${styles.cancelEditButton}`);
  //   cancelEditButton?.addEventListener('click', () => {
  //     replyItem.innerHTML = `
  //       ${replyText}
  //       <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
  //       <i class="fa-regular fa-trash-can ${styles.deleteReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
  //     `;
  //     const editReplyButton = replyItem.querySelector(`.${styles.editReplyButton}`);
  //     editReplyButton?.addEventListener('click', this.handleEditReply.bind(this));
      
  //     const deleteReplyButton = replyItem.querySelector(`.${styles.deleteReplyButton}`);
  //     deleteReplyButton?.addEventListener('click', this.handleDeleteReply.bind(this));
  //   });

  // }

  // private handleEditReply(event: Event): void {
  //   const button = event.target as HTMLButtonElement;
  //   const itemId = parseInt(button.getAttribute('data-item-id')!, 10);
  //   const replyIndex = parseInt(button.getAttribute('data-reply-index')!, 10);
  
  //   const replyItem = button.parentElement!;
  //   const replyText = replyItem.firstChild!.textContent!.trim();
  
  //   replyItem.innerHTML = `
  //     <textarea class="${styles.editReplyInput}" style="width: 90%; min-height: 100px; padding: 8px; margin-bottom: 10px;">${replyText}</textarea>
  //     <div class="${styles.replyButtonsContainer}">
  //       <button class="${styles.saveReplyButton}">Save</button>
  //       <button class="${styles.cancelEditButton}">Cancel</button>
  //     </div>
  //   `;
  
  //   const saveReplyButton = replyItem.querySelector(`.${styles.saveReplyButton}`);
  //   saveReplyButton?.addEventListener('click', () => {
  //     const editReplyInput = replyItem.querySelector(`.${styles.editReplyInput}`) as HTMLInputElement;
  //     const updatedReplyText = editReplyInput.value;
  
  //     this.updateReply(itemId, replyIndex, updatedReplyText);
  //   });
  
  //   const cancelEditButton = replyItem.querySelector(`.${styles.cancelEditButton}`);
  //   cancelEditButton?.addEventListener('click', () => {
  //     replyItem.innerHTML = `
  //       ${replyText}
  //       <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
  //       <i class="fa-regular fa-trash-can ${styles.deleteReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
  //     `;
  //     const editReplyButton = replyItem.querySelector(`.${styles.editReplyButton}`);
  //     editReplyButton?.addEventListener('click', this.handleEditReply.bind(this));
      
  //     const deleteReplyButton = replyItem.querySelector(`.${styles.deleteReplyButton}`);
  //     deleteReplyButton?.addEventListener('click', this.handleDeleteReply.bind(this));
  //   });
  // }

  private handleEditReply(event: Event): void {
    const button = event.target as HTMLButtonElement;
    const itemId = parseInt(button.getAttribute('data-item-id')!, 10);
    const replyIndex = parseInt(button.getAttribute('data-reply-index')!, 10);
  
    const replyItem = button.parentElement!;
    const replyTextElement = replyItem.querySelector('pre');
    const replyText = replyTextElement ? replyTextElement.textContent!.trim() : '';
  
    console.log('Editing reply:', { itemId, replyIndex, replyText });
  
    replyItem.innerHTML = `
      <textarea class="${styles.editReplyInput}" style="width: 90%; min-height: 100px; padding: 8px; margin-bottom: 10px;">${replyText}</textarea>
      <div class="${styles.replyButtonsContainer}">
        <button class="${styles.saveReplyButton}">Save</button>
        <button class="${styles.cancelEditButton}">Cancel</button>
      </div>
    `;
  
    const textarea = replyItem.querySelector(`.${styles.editReplyInput}`) as HTMLTextAreaElement;
  
    // Function to auto-expand the textarea
    const autoExpand = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
  
    // Initial auto-expand
    autoExpand(textarea);
  
    // Add input event listener to auto-expand on input
    textarea.addEventListener('input', () => autoExpand(textarea));
  
    const saveReplyButton = replyItem.querySelector(`.${styles.saveReplyButton}`);
    saveReplyButton?.addEventListener('click', () => {
      const editReplyInput = replyItem.querySelector(`.${styles.editReplyInput}`) as HTMLInputElement;
      const updatedReplyText = editReplyInput.value;
  
      console.log('Saving reply:', { itemId, replyIndex, updatedReplyText });
  
      this.updateReply(itemId, replyIndex, updatedReplyText);
    });
  
    const cancelEditButton = replyItem.querySelector(`.${styles.cancelEditButton}`);
    cancelEditButton?.addEventListener('click', () => {
      console.log('Cancelling edit:', { itemId, replyIndex });
  
      replyItem.innerHTML = `
        <pre>${replyText}</pre>
        <i class="fa-regular fa-pen-to-square ${styles.editReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
        <i class="fa-regular fa-trash-can ${styles.deleteReplyButton}" data-reply-index="${replyIndex}" data-item-id="${itemId}"></i>
      `;
      const editReplyButton = replyItem.querySelector(`.${styles.editReplyButton}`);
      editReplyButton?.addEventListener('click', this.handleEditReply.bind(this));
      
      const deleteReplyButton = replyItem.querySelector(`.${styles.deleteReplyButton}`);
      deleteReplyButton?.addEventListener('click', this.handleDeleteReply.bind(this));
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
        const sortedAndFilteredItems = sortAndFilterItems(filteredItems, this.sortOrder, this.currentFilter);
        this.renderList(sortedAndFilteredItems);
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
  
    //const replies = listItem.Replies ? listItem.Replies.split('\n') : [];
    const replies = listItem.Replies ? [listItem.Replies] : [];
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
        const items = await this.getListData();
        this.renderList(items);
        // Move the alert to your rendering logic if needed
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
  
    //const replies = listItem.Replies ? listItem.Replies.split('\n') : [];
    const replies = listItem.Replies ? [listItem.Replies] : [];
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
  
  private renderArchive(rejectedItems: ISPList[]): void {
    console.log(`renderArchive called with ${rejectedItems.length} items`);
    const sortedItems = sortAndFilterItems(rejectedItems, this.sortOrder, this.currentFilter);
    const totalPages = Math.ceil(sortedItems.length / this.itemsPerPage);
    
    if (this.currentArchivePage > totalPages) {
      this.currentArchivePage = totalPages;
    }
    
    const startIndex = (this.currentArchivePage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedItems = sortedItems.slice(startIndex, endIndex);

    if (rejectedItems.length === 0) {
      const archiveListContainer = this.domElement.querySelector('#archiveListContainer') as HTMLElement;
      if (archiveListContainer) {
        archiveListContainer.innerHTML = '<p>No archived items found.</p>';
      }
      return;
    }
  
    const archiveListContainer = this.domElement.querySelector('#archiveListContainer');
    if (archiveListContainer) {
      let html = '';
      
      if (paginatedItems.length === 0) {
        html = '<p>No archived items found.</p>';
      } else {
        paginatedItems.forEach((item: ISPList) => {
          const createdDate = new Date(item.Created);
          const formattedDate = createdDate.toLocaleDateString();
          const formattedTime = createdDate.toLocaleTimeString();
          //const replies = item.Replies ? item.Replies.split('\n') : [];
          const replies = item.Replies ? [item.Replies] : [];
  
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
                        <input type="checkbox" class="archive-toggle" data-item-id="${item.Id}" ${item.Status === 'Rejected' ? '' : 'checked'}>                      
                        <span class="${styles.rejectedSlider} ${item.Status === 'Rejected' ? styles.rejectedSlider : ''}">
                        <span class="${styles.rejectedStatus}">Rejected</span>
                      </span>
                    </label>
                  </div>
                  <div class="${styles.commentSection}">
                  <i class="fa-regular fa-star ${styles.starIcon}" data-item-id="${item.Id}"></i>
                  <i class="fa-solid fa-comment ${styles.commentIcon}"></i>
                  <span class="${styles.replyCount}">${replies.length}</span>
                </div>
                </div>
                <hr>
                <div class="${styles.repliesContainerA}">
                  <ul class="${styles.replyList}">
                    ${replies.map((reply, index) => `
                      <li>
                        <pre> ${reply} </pre>
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
      archiveListContainer.innerHTML = html;

      // Use event delegation for delete icons
      archiveListContainer.addEventListener('click', this.handleDeleteItemList.bind(this));

      this.addArchiveEventListeners(archiveListContainer);
      this.archivedItems = rejectedItems;
  
      // Add event listeners
      const toggleSwitches = archiveListContainer.querySelectorAll('input[type="checkbox"]');
      toggleSwitches.forEach((toggleSwitch) => {
        toggleSwitch.addEventListener('change', this.handleArchiveToggleChange.bind(this));
      });
  
      const deleteIcons = archiveListContainer.querySelectorAll(`.${styles.deleteIcon}`);
      deleteIcons.forEach((deleteIcon) => {
        deleteIcon.addEventListener('click', this.handleDeleteItemList.bind(this));
      });
  
      const editReplyButtons = archiveListContainer.querySelectorAll(`.${styles.editReplyButton}`);
      editReplyButtons.forEach((button) => {
        button.addEventListener('click', this.handleEditReply.bind(this));
      });
  
      const deleteReplyButtons = archiveListContainer.querySelectorAll(`.${styles.deleteReplyButton}`);
      deleteReplyButtons.forEach((button) => {
        button.addEventListener('click', this.handleDeleteReply.bind(this));
      });
  
      const replyForms = archiveListContainer.querySelectorAll(`.${styles.replyForm}`);
      replyForms.forEach((form) => {
        form.addEventListener('submit', this.handleReplySubmit.bind(this));
      });

      const commentIcons = archiveListContainer.querySelectorAll(`.${styles.commentSection}`);
      commentIcons.forEach((icon) => {
        icon.addEventListener('click', (event) => {
          event.preventDefault(); // Prevent any default action
          event.stopPropagation(); // Stop the event from bubbling up

          if (icon instanceof HTMLElement) {
            const listItem = icon.closest(`.${styles.listItem}`);
            if (listItem instanceof HTMLElement) {
              const repliesContainer = listItem.querySelector(`.${styles.repliesContainer}`);
              if (repliesContainer instanceof HTMLElement) {
                const isHidden = repliesContainer.classList.toggle('hidden');
                console.log('Toggled hidden class:', isHidden);
                icon.classList.toggle(`${styles.active}`);

                // Force a reflow to ensure the transition takes effect
                void repliesContainer.offsetWidth;

                if (isHidden) {
                  repliesContainer.style.maxHeight = '0px';
                } else {
                  repliesContainer.style.maxHeight = `${repliesContainer.scrollHeight}px`;
                }
              }
            }
          }
        });
      });
    }
  
    const archivePagination = this.domElement.querySelector('#archivePagination .archive-page-numbers');
    if (archivePagination) {
      this.setupPagination(archivePagination, sortedItems, true);
    }
  }
  
  private async handleArchiveToggleChange(event: Event): Promise<void> {
    const toggleSwitch = event.target as HTMLInputElement;
    const itemId = parseInt(toggleSwitch.getAttribute('data-item-id')!, 10);
    const newStatus = toggleSwitch.checked ? 'Under Review' : 'Rejected';
  
    await this.updateItemStatus(itemId, newStatus);
    
    // Refresh the data
    const items = await this.getListData();
    this.mainListItems = items.filter(item => item.Status !== 'Rejected');
    this.archivedItems = items.filter(item => item.Status === 'Rejected');
    
    // Re-render only the archive list
    this.renderArchive(this.archivedItems);
  
    // Update pagination for archive list
    const archivePaginationNumbers = this.domElement.querySelector('#archivePagination .archive-page-numbers');
    if (archivePaginationNumbers) {
      this.setupPagination(archivePaginationNumbers, this.archivedItems, true);
    }
  
    // If the item was moved to 'Under Review', show a notification
    if (newStatus === 'Under Review') {
      this.showNotification('Item moved to Under Review status');
    }
  
    // Ensure archive list remains visible
    const archiveListContainer = this.domElement.querySelector('#archiveListContainer') as HTMLElement;
    const archivePagination = this.domElement.querySelector('#archivePagination') as HTMLElement;
    if (archiveListContainer && archivePagination) {
      archiveListContainer.style.display = 'block';
      archivePagination.style.display = 'flex';
    }
  }

  // Add this new method to show a notification
private showNotification(message: string): void {
  const notificationElement = document.createElement('div');
  notificationElement.textContent = message;
  notificationElement.style.position = 'fixed';
  notificationElement.style.top = '20px';
  notificationElement.style.right = '20px';
  notificationElement.style.backgroundColor = '#4CAF50';
  notificationElement.style.color = 'white';
  notificationElement.style.padding = '15px';
  notificationElement.style.borderRadius = '5px';
  notificationElement.style.zIndex = '1000';

  document.body.appendChild(notificationElement);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    document.body.removeChild(notificationElement);
  }, 3000);
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

        this.mainListItems = items.filter(item => item.Status !== 'Rejected');
        this.archivedItems = items.filter(item => item.Status === 'Rejected');
        
        console.log(`Render: Main list items: ${this.mainListItems.length}, Archived items: ${this.archivedItems.length}`);
        
        const totalPages = Math.ceil(items.length / this.itemsPerPage);
        console.log(`Main List - Total Pages: ${totalPages}`);
  
        this.domElement.innerHTML = `
          <head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          </head>
          
          <header>
            <h1>Ask CEO</h1>
            <div id="statusChart" class="${styles.statusChart}"></div>
            <div class="${styles.archiveLink}">
              <i class="fa-solid fa-box-archive" id="archiveIcon"></i>
              <a href="#" id="archiveLink">Archive</a>
            </div>
          </header>
  
          <div class="${styles.searchBox}">
            <input type="text" placeholder="Search..." id="searchInput">
          </div>
  
          <div class="filterContainer">
            <div class="${styles.customSelect}">
              <select id="sortSelect">
                <option value="${SortOrder.Newest}">Newest</option>
                <option value="${SortOrder.Oldest}">Oldest</option>               
                <option value="${SortOrder.Asc}">A-Z</option>
                <option value="${SortOrder.Desc}">Z-A</option>               
              </select>            
            </div>
           <div class="${styles.customSelect}">
              <select id="filterSelect">
                <option value="">All</option>
                <option value="Under Review">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Favorite">Favorites</option>
              </select>            
            </div>
          </div>
  
          <div id="spListContainer" class="${styles.spListContainers}"></div>
          <div id="archiveListContainer" style="display: none;"></div>
          <div id="spPagination" class="${styles.pagination}">
            <ul class="${styles.paginationWrapper}">
              <a class="prev-button">&lt;</a>
              <span class="page-numbers"></span>
              <a class="next-button">&gt;</a>
            </ul>
          </div>
          <div id="archivePagination" class="${styles.pagination}" style="display: none;">
            <ul class="${styles.paginationWrapper}">
              <a class="archive-prev-button">&lt;</a>
              <span class="archive-page-numbers"></span>
              <a class="archive-next-button">&gt;</a>
            </ul>
          </div>
        `;
  
        this.renderList(this.mainListItems);
  
        const archiveLink = this.domElement.querySelector('#archiveLink');
        const archiveIcon = this.domElement.querySelector('#archiveIcon');
        if (archiveLink && archiveIcon) {
          console.log('Archive link found');
          archiveLink.addEventListener('click', (event: Event) => {
            event.preventDefault();
            console.log('Archive link clicked');
          
            const archiveListContainer = this.domElement.querySelector('#archiveListContainer') as HTMLElement;
            const spListContainer = this.domElement.querySelector('#spListContainer') as HTMLElement;
            const spPagination = this.domElement.querySelector('#spPagination') as HTMLElement;
            const archivePagination = this.domElement.querySelector('#archivePagination') as HTMLElement;
          
            if (archiveListContainer && spListContainer && spPagination && archivePagination) {
              if (archiveListContainer.style.display === 'none') {
                // Switch to archive view
                archiveListContainer.style.display = 'block';
                archivePagination.style.display = 'flex';
                spListContainer.style.display = 'none';
                spPagination.style.display = 'none';
                this.currentArchivePage = 1;
                this.renderArchive(this.archivedItems);
                
                // Change link text and icon
                archiveLink.textContent = 'Back to List';
                archiveIcon.className = 'fa-solid fa-arrow-left';
              } else {
                // Switch back to main list view
                archiveListContainer.style.display = 'none';
                archivePagination.style.display = 'none';
                spListContainer.style.display = 'block';
                spPagination.style.display = 'flex';
                this.currentPage = 1;
                this.renderList(this.mainListItems);
                
                // Revert link text and icon
                archiveLink.textContent = 'Archive';
                archiveIcon.className = 'fa-solid fa-box-archive';
              }
            } else {
              console.log('Containers or pagination elements not found');
            }
            // Update the active states for both paginations
            this.updateActiveButton(false);
            this.updateArchiveActiveButton();
          });
        }
  
        const sortSelect = this.domElement.querySelector('#sortSelect');
        const filterSelect = this.domElement.querySelector('#filterSelect');
        if (sortSelect && filterSelect) {
          sortSelect.addEventListener('change', this.handleSortFilterChange.bind(this));
          filterSelect.addEventListener('change', this.handleSortFilterChange.bind(this));
        }
        
        const searchInput = this.domElement.querySelector('#searchInput');
        if (searchInput) {
          searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        const prevButton = this.domElement.querySelector('.prev-button');
        const nextButton = this.domElement.querySelector('.next-button');
        const spPagination = this.domElement.querySelector('#spPagination .page-numbers');
        
        if (spPagination) {
          prevButton?.addEventListener('click', () => {
            if (this.currentPage > 1) {
              this.handlePageChange(this.currentPage - 1, items, spPagination, false);
            }
          });
        
          nextButton?.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
              this.handlePageChange(this.currentPage + 1, items, spPagination, false);
            }
          });
        
          // Initial setup of pagination
          this.setupPagination(spPagination, items, false);
        }
        })
        .catch((error) => {
          console.error('Error retrieving list data:', error);
        });
  }
  

  private addPaginationEventListeners(paginationElement: Element, items: ISPList[], isArchive: boolean): void {
    const pageNumbers = paginationElement.querySelectorAll('.page-number');
    pageNumbers.forEach((pageNumber) => {
      pageNumber.addEventListener('click', (event: Event) => {
        this.handlePageChange(parseInt((event.target as HTMLButtonElement).getAttribute('data-page')!, 10), items, paginationElement, isArchive);
      });
    });
  
    const prevButton = isArchive ? this.domElement.querySelector('.archive-prev-button') : this.domElement.querySelector('.prev-button');
    const nextButton = isArchive ? this.domElement.querySelector('.archive-next-button') : this.domElement.querySelector('.next-button');
  
    prevButton?.addEventListener('click', () => {
      const currentPage = isArchive ? this.currentArchivePage : this.currentPage;
      if (currentPage > 1) {
        this.handlePageChange(currentPage - 1, items, paginationElement, isArchive);
      }
    });
  
    nextButton?.addEventListener('click', () => {
      const currentPage = isArchive ? this.currentArchivePage : this.currentPage;
      const totalPages = Math.ceil(items.length / this.itemsPerPage);
      if (currentPage < totalPages) {
        this.handlePageChange(currentPage + 1, items, paginationElement, isArchive);
      }
    });
  }

  private async updateItemFavoriteStatus(itemId: number, isFavorite: boolean): Promise<void> {
    await this.context.spHttpClient.post(
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
          IsFavorite: isFavorite,
        }),
      }
    );
  }

  private async handleStarClick(event: Event): Promise<void> {
    const starIcon = event.target as HTMLElement;
    const itemId = parseInt(starIcon.getAttribute('data-item-id')!, 10);
    const isFavorite = starIcon.classList.contains('fa-solid');
  
    try {
      // Update local state immediately
      this.updateStarIconUI(starIcon, !isFavorite);
  
      // Update in SharePoint
      await this.updateItemFavoriteStatus(itemId, !isFavorite);
  
      // Update the item in the local list
      const updatedItem = this.mainListItems.find(item => item.Id === itemId);
      if (updatedItem) {
        updatedItem.IsFavorite = !isFavorite;
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert('Failed to update favorite status. Please try again.');
      // Revert the UI change if there was an error
      this.updateStarIconUI(starIcon, isFavorite);
    }
  }
  
  private updateStarIconUI(starIcon: HTMLElement, isFavorite: boolean): void {
    if (isFavorite) {
      starIcon.classList.remove('fa-regular');
      starIcon.classList.add('fa-solid');
      starIcon.style.color = 'gold';
    } else {
      starIcon.classList.remove('fa-solid');
      starIcon.classList.add('fa-regular');
      starIcon.style.color = '';
    }
  }

  private handlePageChange(newPage: number, items: ISPList[], paginationElement: Element, isArchive: boolean): void {
    console.log(`Changing to page number: ${newPage}`);
    if (isArchive) {
      this.currentArchivePage = newPage;
      this.renderArchive(items.filter(item => item.Status === 'Rejected'));
    } else {
      this.currentPage = newPage;
      this.renderList(items.filter(item => item.Status !== 'Rejected'));
    }
    
    // Re-render pagination
    this.setupPagination(paginationElement, items, isArchive);
  }

  private addArchiveEventListeners(archiveListContainer: Element): void {
    const toggleSwitches = archiveListContainer.querySelectorAll('.archive-toggle');
    toggleSwitches.forEach((toggleSwitch) => {
      toggleSwitch.addEventListener('change', this.handleArchiveToggleChange.bind(this));
    });
  
    const editReplyButtons = archiveListContainer.querySelectorAll(`.${styles.editReplyButton}`);
    editReplyButtons.forEach((button) => {
      button.addEventListener('click', this.handleEditReply.bind(this));
    });
  
    const deleteReplyButtons = archiveListContainer.querySelectorAll(`.${styles.deleteReplyButton}`);
    deleteReplyButtons.forEach((button) => {
      button.addEventListener('click', this.handleDeleteReply.bind(this));
    });
  
    const replyForms = archiveListContainer.querySelectorAll(`.${styles.replyForm}`);
    replyForms.forEach((form) => {
      form.addEventListener('submit', this.handleReplySubmit.bind(this));
    });
  }

  private setupPagination(paginationElement: Element, items: ISPList[], isArchive: boolean): void {
    const totalPages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    const currentPage = isArchive ? this.currentArchivePage : this.currentPage;
    
    console.log(`${isArchive ? 'Archive' : 'Main'} List - Current Page: ${currentPage}, Total Pages: ${totalPages}`);
    
    paginationElement.innerHTML = renderPageNumbers(totalPages, currentPage, 5);
    this.addPaginationEventListeners(paginationElement, items, isArchive);
    this.updateActiveButton(isArchive);
  }

  private updateArchiveActiveButton() {
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

  private handleSortFilterChange(): void {
    const sortSelect = this.domElement.querySelector('#sortSelect') as HTMLSelectElement;
    const filterSelect = this.domElement.querySelector('#filterSelect') as HTMLSelectElement;
  
    this.sortOrder = sortSelect.value as SortOrder;
    this.currentFilter = filterSelect.value;
    this.currentPage = 1;
  
    this.renderList(this.mainListItems);
  }

  private updateActiveButton(isArchive: boolean): void {
    const pageNumbers = this.domElement.querySelectorAll(isArchive ? '#archivePagination .page-number' : '#spPagination .page-number');
    const currentPage = isArchive ? this.currentArchivePage : this.currentPage;
    
    pageNumbers.forEach((pageNumber) => {
      const pageNum = parseInt((pageNumber as HTMLElement).getAttribute('data-page')!, 10);
      if (pageNum === currentPage) {
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