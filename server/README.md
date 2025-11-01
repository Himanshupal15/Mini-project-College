Mini project College — Upload server

This small Express server accepts file uploads (multipart/form-data) and serves them from /uploads.

Quick start

1. Install dependencies:

   npm install

2. Start server:

   npm run start

By default the server listens on port 3001 and exposes:

- POST /upload — accepts field `files` (multiple) and returns JSON `{ files: [{name,type,url}] }`
- Static files at /uploads

Use this server during development to store assignment attachments instead of saving them in localStorage.
