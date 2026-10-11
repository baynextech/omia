import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { SEOMeta } from "../components/SEOMeta";
import { apiFetch } from "../lib/api";
import { SITE, absoluteUrl } from "../lib/site";
import { NotFound } from "./Legal";
import { useContent } from "../contexts/ContentContext";

interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  category?: string;
  author?: string;
  published_at: string;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

export function News() {
  const { t, img } = useContent();
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);

  useEffect(() => {
    apiFetch("/api/articles")
      .then((r) => (r.ok ? r.json() : []))
      .then(setArticles)
      .catch(() => setArticles([]));
  }, []);

  return (
    <div className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
      <SEOMeta
        title={t("seo.news.title")}
        description={t("seo.news.description")}
        ogImage={img("seo.image")}
        keywords="noticias de yoga, blog de pilates, bienestar, consejos de yoga"
        canonicalUrl="/noticias"
      />
      <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3">Noticias</p>
      <h1 className="text-4xl md:text-5xl font-serif font-light text-[#1C3829] mb-12">Novedades del mundo del yoga y el pilates</h1>

      {articles === null ? (
        <p className="text-[#5D5D5D]">Cargando…</p>
      ) : articles.length === 0 ? (
        <p className="text-[#5D5D5D]">Todavía no publicamos notas. ¡Volvé pronto!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((a) => (
            <Link key={a.id} to={`/noticias/${a.slug}`} className="group bg-white border border-[#E8E0D0] rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {a.image && <img src={a.image} alt="" loading="lazy" className="h-48 w-full object-cover" />}
              <div className="p-6 flex flex-col gap-2 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#98A77C]">{a.category}</span>
                <h2 className="text-xl font-serif text-[#1C3829] group-hover:text-[#6f8656] transition-colors">{a.title}</h2>
                {a.excerpt && <p className="text-sm text-[#5D5D5D] leading-relaxed line-clamp-3">{a.excerpt}</p>}
                <span className="text-xs text-[#5D5D5D] mt-auto pt-3">{formatDate(a.published_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState<(ArticleSummary & { body: string }) | null | undefined>(undefined);

  useEffect(() => {
    setArticle(undefined);
    apiFetch(`/api/articles/${encodeURIComponent(slug || "")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setArticle)
      .catch(() => setArticle(null));
  }, [slug]);

  if (article === undefined) return <div className="pt-40 text-center text-[#5D5D5D]">Cargando…</div>;
  if (article === null) return <NotFound />;

  return (
    <article className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
      <SEOMeta
        title={article.title}
        description={article.excerpt || article.title}
        ogImage={article.image || undefined}
        ogType="article"
        canonicalUrl={`/noticias/${article.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt || undefined,
          image: article.image || undefined,
          datePublished: article.published_at,
          author: { "@type": "Organization", name: article.author || "Equipo Omia" },
          publisher: { "@type": "Organization", name: SITE.legalName },
          mainEntityOfPage: absoluteUrl(`/noticias/${article.slug}`),
        }}
      />
      <Link to="/noticias" className="text-sm text-[#6f8656] hover:underline">← Todas las noticias</Link>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#98A77C] mt-6">{article.category}</span>
      <h1 className="text-4xl md:text-5xl font-serif font-light text-[#1C3829] mt-2 mb-3 leading-tight">{article.title}</h1>
      <p className="text-sm text-[#5D5D5D] mb-8">{article.author} · {formatDate(article.published_at)}</p>
      {article.image && <img src={article.image} alt="" className="w-full rounded-2xl mb-8 max-h-[420px] object-cover" />}
      <div className="space-y-5 text-[16px] leading-relaxed text-[#3d3d3d] [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:text-[#1C3829] [&_h2]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#6f8656] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#98A77C] [&_blockquote]:pl-4 [&_blockquote]:italic">
        <ReactMarkdown>{article.body}</ReactMarkdown>
      </div>
    </article>
  );
}
