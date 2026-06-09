function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var spreadsheetId = 'SPREADSHEET_ID'; // Ganti dengan ID Spreadsheet Anda
    var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Absensi');
    if (!sheet) {
      sheet = SpreadsheetApp.openById(spreadsheetId).insertSheet('Absensi');
      sheet.appendRow(['Nama', 'Tanggal', 'Jam', 'Foto Base64', 'Waktu Server']);
    }

    sheet.appendRow([
      data.nama || '',
      data.tanggal || '',
      data.jam || '',
      data.foto || '',
      new Date()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
