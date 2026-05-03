require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Environment variables
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !apiKey) {
    console.error("❌ Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in .env.local");
    process.exit(1);
}

client
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const dbId = 'news_portal_db';

async function initAppwrite() {
    try {
        console.log(`🚀 Initializing Appwrite Backend...`);
        
        // 1. Create Database
        try {
            await databases.create(dbId, 'News Portal DB');
            console.log(`✅ Database created: ${dbId}`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Database ${dbId} already exists.`);
            else throw e;
        }

        // 2. Create Channels Collection
        const channelsColl = 'channels';
        try {
            await databases.createCollection(dbId, channelsColl, 'Channels');
            console.log(`✅ Collection created: ${channelsColl}`);
            
            // Attributes
            await databases.createStringAttribute(dbId, channelsColl, 'name', 255, true);
            await databases.createStringAttribute(dbId, channelsColl, 'youtube_id', 50, true);
            await databases.createStringAttribute(dbId, channelsColl, 'state', 50, true);
            await databases.createBooleanAttribute(dbId, channelsColl, 'is_active', false, true);
            console.log(`✅ Attributes added to ${channelsColl}`);
            
            // Wait a moment for attributes to be created before inserting data
            await new Promise(r => setTimeout(r, 2000));
            
            // Seed Channels Data
            const defaultChannels = [
                { name: 'State News 1', youtube_id: '1wECsnGZcfc', state: 'Kerala', is_active: true },
                { name: 'State News 2', youtube_id: 's0LLVQeMmtU', state: 'Kerala', is_active: true },
                { name: 'State News 3', youtube_id: 'nObUcHKZEGY', state: 'Tamil Nadu', is_active: true },
                { name: 'State News 4', youtube_id: 'AT0fo8Ty4jo', state: 'Karnataka', is_active: true }
            ];
            for (const ch of defaultChannels) {
                await databases.createDocument(dbId, channelsColl, sdk.ID.unique(), ch);
            }
            console.log(`✅ Seeded ${channelsColl} with default channels.`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${channelsColl} already exists.`);
            else throw e;
        }

        // 3. Create Settings Collection
        const settingsColl = 'site_settings';
        try {
            await databases.createCollection(dbId, settingsColl, 'Site Settings');
            console.log(`✅ Collection created: ${settingsColl}`);
            
            await databases.createIntegerAttribute(dbId, settingsColl, 'min_viewers', false, 1000);
            await databases.createIntegerAttribute(dbId, settingsColl, 'max_viewers', false, 5000);
            await databases.createStringAttribute(dbId, settingsColl, 'header_ad', 2000, false);
            await databases.createStringAttribute(dbId, settingsColl, 'sidebar_ad', 2000, false);
            console.log(`✅ Attributes added to ${settingsColl}`);
            
            await new Promise(r => setTimeout(r, 2000));
            
            // Seed Setting
            await databases.createDocument(dbId, settingsColl, 'global_config', {
                min_viewers: 1000,
                max_viewers: 5000,
                header_ad: '<!-- Header Ad -->',
                sidebar_ad: '<!-- Sidebar Ad -->'
            });
            console.log(`✅ Seeded ${settingsColl} with default configuration.`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${settingsColl} already exists.`);
            else throw e;
        }

        // 4. Create Chat Collection
        const chatColl = 'chat_messages';
        try {
            await databases.createCollection(dbId, chatColl, 'Chat Messages');
            console.log(`✅ Collection created: ${chatColl}`);
            
            await databases.createStringAttribute(dbId, chatColl, 'username', 100, true);
            await databases.createStringAttribute(dbId, chatColl, 'text', 1000, true);
            console.log(`✅ Attributes added to ${chatColl}`);

            // Update Permissions for Chat so anyone can read/write (since it's a live chat)
            // In Appwrite, you do this on the collection level.
            // Wait for attributes to apply...
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${chatColl} already exists.`);
            else throw e;
        }

        console.log(`🎉 Backend Initialization Complete!`);
    } catch (error) {
        console.error("❌ Failed to initialize Appwrite:", error.message);
    }
}

initAppwrite();
