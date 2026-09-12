import fs from 'fs';
const html = fs.readFileSync('public/admin.html', 'utf8');

// I will look for anything that might clear the form.
const editContentBody = html.substring(html.indexOf('window.editContent = function(id) {'), html.indexOf('window.resetUploadForm = function() {'));
console.log(editContentBody);
