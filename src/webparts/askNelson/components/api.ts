import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ISPList } from './interfaces';

export async function getListData(context: any): Promise<ISPList[]> {
    const response = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/GetByTitle('Reflection')/items`,
      SPHttpClient.configurations.v1
    ); 
    if (!response.ok) {
      throw new Error(`Error fetching list data: ${response.statusText}`);
    } 
    const data = await response.json();
    return data.value;
}

export async function submitReply(itemId: number, replyText: string): Promise<void> {
  const listItem: ISPList = await getListItem(itemId);
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

export async function getListItem(itemId: number): Promise<ISPList> {
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
