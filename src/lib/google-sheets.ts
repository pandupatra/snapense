import { google } from 'googleapis';

export interface BillForSheets {
  no: number;
  transactionDate: string;
  merchant: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  createdDate: string;
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function createSpreadsheetWithAuth(
  accessToken: string,
  bills: BillForSheets[]
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  // Create new spreadsheet
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Bill Tracker - ${new Date().toLocaleDateString()}`,
      },
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet');
  }

  // Prepare data with headers
  const headers = ['No', 'Transaction Date', 'Merchant', 'Amount', 'Currency', 'Notes', 'Created Date'];
  const rows = bills.map((bill, index) => [
    index + 1,
    bill.transactionDate,
    bill.merchant || '',
    bill.amount,
    bill.currency,
    bill.notes || '',
    bill.createdDate,
  ]);

  // Add header row and data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  // Format the header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: 'COLUMNS',
            },
            properties: {
              pixelSize: 150,
            },
            fields: 'pixelSize',
          },
        },
      ],
    },
  });

  return spreadsheetId;
}
