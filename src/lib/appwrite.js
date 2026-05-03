import { Client, Databases, Account } from 'appwrite';

const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'dummy_project_id'); // Replace with your actual project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'news_portal_db';
export const CHANNELS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID || 'channels';
export const CHAT_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_messages';
export const SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID || 'site_settings';

export default client;
