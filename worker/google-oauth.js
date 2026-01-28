// Google Workspace API Utilities with OAuth Authentication
// Ported from Netlify function to TypeScript for Vercel - CommonJS version

const { google } = require('googleapis');

// Environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

/**
 * Get authenticated Google API client using OAuth 2.0
 * Uses refresh token to generate access tokens automatically
 */
function getOAuthClient() {
    try {
        if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
            throw new Error('Missing OAuth credentials. Please set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN');
        }

        const oauth2Client = new google.auth.OAuth2(
            OAUTH_CLIENT_ID,
            OAUTH_CLIENT_SECRET,
            'https://relawanns.vercel.app/api/oauth-callback'
        );

        // Set refresh token - this will auto-refresh access tokens
        oauth2Client.setCredentials({
            refresh_token: OAUTH_REFRESH_TOKEN,
        });

        return oauth2Client;
    } catch (error) {
        console.error('Failed to create OAuth client:', error);
        throw error;
    }
}

/**
 * Find or create a sheet (tab) by name in the spreadsheet
 * @param sheetName - Name of the sheet to find or create
 * @returns Sheet ID
 */
async function getOrCreateSheet(sheetName) {
    try {
        const auth = getOAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        if (!SPREADSHEET_ID) {
            throw new Error('GOOGLE_SHEET_ID is not set');
        }

        // Get all sheets in the spreadsheet
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        // Check if sheet already exists
        const existingSheet = metadata.data.sheets?.find(
            (sheet) => sheet.properties?.title === sheetName
        );

        if (existingSheet && typeof existingSheet.properties?.sheetId === 'number') {
            console.log(`📋 Sheet "${sheetName}" already exists`);
            return existingSheet.properties.sheetId;
        }

        // Create new sheet
        console.log(`📋 Creating new sheet: "${sheetName}"`);
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: sheetName,
                                gridProperties: {
                                    frozenRowCount: 1, // Freeze header row
                                },
                            },
                        },
                    },
                ],
            },
        });

        const newSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
        if (typeof newSheetId !== 'number') {
            throw new Error('Failed to get new sheet ID');
        }

        // Add header row
        const headerRow = [
            'No',
            'Nama',
            'Email',
            'No WA',
            'Usia',
            'Domisili',
            'Instagram',
            'Pernah ikut relawanns?',
            'Ukuran Vest',
            'Link Bukti Bayar',
            'Screenshot TikTok',
            'Screenshot IG',
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [headerRow],
            },
        });

        // Apply beautiful formatting to header row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    // 1. Set header background to purple and text to white + bold
                    {
                        repeatCell: {
                            range: {
                                sheetId: newSheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.416, // Purple color #6A1B9A
                                        green: 0.106,
                                        blue: 0.604,
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 1.0,
                                            green: 1.0,
                                            blue: 1.0,
                                        },
                                        fontSize: 10,
                                        bold: true,
                                    },
                                    horizontalAlignment: 'LEFT',
                                    verticalAlignment: 'MIDDLE',
                                },
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
                        },
                    },
                    // 2. Auto-resize all columns
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId: newSheetId,
                                dimension: 'COLUMNS',
                                startIndex: 0,
                                endIndex: headerRow.length,
                            },
                        },
                    },
                ],
            },
        });

        console.log(`✅ Sheet "${sheetName}" created with beautiful purple header!`);
        return newSheetId;
    } catch (error) {
        console.error('❌ Error in getOrCreateSheet:', error);
        throw error;
    }
}

/**
 * Append a row of data to a sheet
 * @param sheetName - Name of the sheet
 * @param rowData - Array of values for the row
 */
async function appendToSheet(sheetName, rowData) {
    try {
        const auth = getOAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        if (!SPREADSHEET_ID) {
            throw new Error('GOOGLE_SHEET_ID is not set');
        }

        // Get current row count to calculate row number
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:A`,
        });

        const rowCount = response.data.values ? response.data.values.length : 0;
        const rowNumber = rowCount; // Header is row 1, so this is the next available row

        // Prepend row number to data
        const dataWithNumber = [rowNumber, ...rowData];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${rowCount + 1}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [dataWithNumber],
            },
        });

        console.log(`✅ Data appended to sheet "${sheetName}"`);
    } catch (error) {
        console.error('❌ Error in appendToSheet:', error);
        throw error;
    }
}

/**
 * Upload a file to Google Drive using OAuth
 * @param fileBuffer - File buffer
 * @param fileName - Name for the file
 * @param mimeType - MIME type of the file
 * @param parentFolderId - Parent folder ID (optional)
 * @returns Shareable link to the file
 */
async function uploadToDrive(
    fileBuffer,
    fileName,
    mimeType,
    parentFolderId = null
) {
    try {
        const auth = getOAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: parentFolderId ? [parentFolderId] : [],
        };

        // Convert ArrayBuffer to Buffer if needed
        const buffer = fileBuffer instanceof ArrayBuffer
            ? Buffer.from(fileBuffer)
            : fileBuffer;

        const { Readable } = require('stream');
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;
        if (!fileId) {
            throw new Error('Failed to get file ID from Drive upload');
        }

        // Make the file accessible to anyone with the link
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`📎 File uploaded: ${fileName} (${fileId})`);
        return response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    } catch (error) {
        console.error('❌ Error in uploadToDrive:', error);
        throw error;
    }
}

/**
 * Find or create a folder in Google Drive
 * @param folderName - Name of the folder
 * @param parentFolderId - Parent folder ID
 * @returns Folder ID
 */
async function getOrCreateFolder(
    folderName,
    parentFolderId = DRIVE_FOLDER_ID || ''
) {
    try {
        const auth = getOAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        if (!parentFolderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set and no parent folder provided');
        }

        // Search for existing folder
        const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
            const folderId = response.data.files[0].id;
            if (folderId) {
                console.log(`📁 Folder "${folderName}" already exists`);
                return folderId;
            }
        }

        // Create new folder
        console.log(`📁 Creating new folder: "${folderName}"`);
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        };

        const folder = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id',
        });

        const folderId = folder.data.id;
        if (!folderId) {
            throw new Error('Failed to create folder');
        }

        console.log(`✅ Folder created: ${folderId}`);
        return folderId;
    } catch (error) {
        console.error('❌ Error in getOrCreateFolder:', error);
        throw error;
    }
}

/**
 * Extract filename from Supabase Storage public URL
 * @param url - Supabase public URL
 * @returns Filename
 */
function extractFileName(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

module.exports = {
    getOAuthClient,
    getOrCreateSheet,
    appendToSheet,
    uploadToDrive,
    getOrCreateFolder,
    extractFileName
};
