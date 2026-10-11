const cfg = window.FOTOKU_CONFIG;
const fnUrl = `${cfg.SUPABASE_URL}/functions/v1/${cfg.PUBLIC_FUNCTION}`;
const slug = new URLSearchParams(location.search).get("slug");
const titleEl=document.getElementById("gallery-title");
const descEl=document.getElementById("gallery-description");
const dateEl=document.getElementById("gallery-date");
const statusEl=document.getElementById("gallery-status");
const grid=document.getElementById("photo-grid");
const downloadAll=document.getElementById("download-all");
let photos=[];
let currentGalleryId=null;
async function trackActivity(eventType){
  if(!currentGalleryId)return;
  try{const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);await client.from("gallery_analytics").insert({gallery_id:currentGalleryId,event_type:eventType});}catch(err){console.warn("Aktivitas statistik tidak tercatat:",err);}
}

function filenameSafe(name){return (name||"foto-hd.jpg").replace(/[\\/:*?"<>|]/g,"_");}
function downloadFilename(name){
  const safe=filenameSafe(name);
  return /\.[a-z0-9]{2,5}$/i.test(safe)?safe:`${safe}.jpg`;
}
function saveBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=downloadFilename(name);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function downloadOne(url,name){
  if(!url)throw new Error("Tautan foto asli tidak tersedia.");
  const response=await fetch(url);
  if(!response.ok)throw new Error("File foto asli tidak berhasil diambil.");
  const blob=await response.blob();
  if(!blob.size)throw new Error("File foto yang diterima kosong.");
  saveBlob(blob,name);
}
async function load() {
  if(!slug){statusEl.textContent="Tautan galeri tidak lengkap.";return;}
  try{
    statusEl.textContent="Memuat foto…";
    const response=await fetch(`${fnUrl}?slug=${encodeURIComponent(slug)}`);
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Galeri gagal dimuat.");
    currentGalleryId=result.gallery.id;
    trackActivity("view");
    titleEl.textContent=result.gallery.nama_acara;
    descEl.textContent=result.gallery.deskripsi||"Kenangan terbaik dalam satu tempat.";
    dateEl.textContent=result.gallery.tanggal_acara?new Date(result.gallery.tanggal_acara+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";
    photos=result.photos||[];grid.replaceChildren();
    if(!photos.length){statusEl.textContent="Belum ada foto di galeri ini.";return;}
    for(const p of photos){
      const card=document.createElement("article");card.className="public-photo-card";
      const img=document.createElement("img");img.src=p.preview_url||p.url;img.alt=p.file_name||"Foto acara";img.loading="lazy";img.decoding="async";
      img.addEventListener("error",()=>{img.alt="Foto tidak dapat dimuat";});
      const bottom=document.createElement("div");bottom.className="photo-card-bottom";
      const name=document.createElement("span");name.className="photo-file-name";name.textContent=p.file_name||"Foto acara";
      const button=document.createElement("button");button.className="btn btn-small";button.textContent="Unduh Foto HD";
      button.onclick=async()=>{trackActivity("download");button.disabled=true;button.textContent="Menyiapkan HD…";try{await downloadOne(p.original_url||p.url,p.file_name);}catch(err){window.open(p.original_url||p.url,"_blank","noopener");statusEl.textContent="Unduhan otomatis gagal. Foto asli dibuka di tab baru; gunakan menu browser untuk menyimpan foto.";}finally{button.disabled=false;button.textContent="Unduh Foto HD";}};
      bottom.append(name,button);card.append(img,bottom);grid.append(card);
    }
    statusEl.textContent=`${photos.length} foto tersedia.`;
    downloadAll.disabled=false;
  }catch(err){console.error(err);statusEl.textContent="Galeri tidak dapat dimuat. Pastikan galeri sudah dipublikasikan dan Edge Function aktif.";}
}
downloadAll.onclick=async()=>{
  if(photos.length) trackActivity("download");
  downloadAll.disabled=true;let done=0;
  for(const p of photos){try{await downloadOne(p.original_url||p.url,p.file_name);done++;await new Promise(r=>setTimeout(r,500));}catch(e){console.warn("Unduhan gagal",p.file_name,e);}}
  statusEl.textContent=`Unduhan diminta untuk ${done} dari ${photos.length} foto asli. Jika browser meminta izin beberapa unduhan, pilih Izinkan.`;
  downloadAll.disabled=false;
};
load();