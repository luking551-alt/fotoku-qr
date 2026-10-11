import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return Response.json({ error: "Method tidak diizinkan." }, { status: 405, headers: corsHeaders });

  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return Response.json({ error: "Slug galeri wajib diisi." }, { status: 400, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: gallery, error: ge } = await admin.from("galeri_acara")
      .select("id,nama_acara,slug,tanggal_acara,deskripsi,is_published")
      .eq("slug", slug).eq("is_published", true).maybeSingle();
    if (ge) throw ge;
    if (!gallery) return Response.json({ error: "Galeri tidak ditemukan atau belum dipublikasikan." }, { status: 404, headers: corsHeaders });

    const { data: photos, error: pe } = await admin.from("photos")
      .select("id,storage_path,file_name").eq("gallery_id", gallery.id).order("created_at", { ascending: true });
    if (pe) throw pe;

    const photoList = [];
    for (const photo of photos ?? []) {
      const { data, error } = await admin.storage.from("fotoku-photos").createSignedUrl(photo.storage_path, 3600);
      if (error) { console.error("Signed URL gagal:", error.message); continue; }
      // preview_url/original_url masih mengarah ke file sumber yang sama.
      // Untuk thumbnail teroptimasi, aktifkan image transformation pada paket Supabase yang mendukungnya.
      photoList.push({ id: photo.id, file_name: photo.file_name, preview_url: data.signedUrl, original_url: data.signedUrl, url: data.signedUrl });
    }
    return Response.json({ gallery, photos: photoList }, { headers: { ...corsHeaders, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("galeri-publik error:", error);
    return Response.json({ error: "Terjadi kesalahan saat memuat galeri." }, { status: 500, headers: corsHeaders });
  }
});