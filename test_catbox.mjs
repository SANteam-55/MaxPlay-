import fetch from 'node-fetch';

const urls = [
  'https://files.catbox.moe/lz21c6.mp4',
  'https://files.catbox.moe/mzmdr8.mp4',
  'https://files.catbox.moe/mv30p9.mp4',
  'https://files.catbox.moe/rynd3k.mp4',
  'https://files.catbox.moe/ijzmsv.mp4',
  'https://files.catbox.moe/bzj0ku.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4'
];

for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { 'Range': 'bytes=0-1000' } });
    console.log(url, "STATUS:", res.status, "TYPE:", res.headers.get('content-type'), "LEN:", res.headers.get('content-length'));
  } catch (e) {
    console.error(url, "ERROR:", e.message);
  }
}
