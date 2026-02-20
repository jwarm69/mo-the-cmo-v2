"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ContentItem } from "@/lib/types";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[320px] rounded-[2rem] border-4 border-gray-800 bg-black p-2 shadow-xl">
      <div className="rounded-[1.5rem] bg-white dark:bg-gray-950 overflow-hidden min-h-[500px]">
        {children}
      </div>
    </div>
  );
}

function TikTokPreview({ item }: { item: ContentItem }) {
  return (
    <PhoneFrame>
      <div className="relative h-[500px] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col justify-end p-4 text-white">
        <div className="absolute top-3 left-0 right-0 text-center text-xs font-semibold opacity-60">
          TikTok
        </div>
        <div className="space-y-2 mb-4">
          <p className="text-sm font-bold">{item.hook}</p>
          <p className="text-xs opacity-90 line-clamp-4">{item.body}</p>
          {item.cta && (
            <p className="text-xs font-semibold text-pink-400">{item.cta}</p>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {item.hashtags.slice(0, 5).map((tag, i) => (
              <span key={i} className="text-xs opacity-70">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function InstagramPreview({ item }: { item: ContentItem }) {
  return (
    <PhoneFrame>
      <div className="flex flex-col h-[500px]">
        <div className="flex items-center gap-2 p-3 border-b">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="text-xs font-semibold">your_brand</span>
        </div>
        <div className="flex-1 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
          <p className="text-center text-sm font-bold px-6">{item.hook}</p>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="text-xs">
            <span className="font-semibold">your_brand</span>{" "}
            <span className="line-clamp-3">{item.body}</span>
          </p>
          {item.hashtags.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {item.hashtags.slice(0, 8).join(" ")}
            </p>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function TwitterPreview({ item }: { item: ContentItem }) {
  return (
    <PhoneFrame>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-500" />
          <div>
            <p className="text-sm font-bold">Your Brand</p>
            <p className="text-xs text-muted-foreground">@yourbrand</p>
          </div>
        </div>
        <div className="space-y-2">
          {item.hook && <p className="text-sm font-semibold">{item.hook}</p>}
          <p className="text-sm">{item.body}</p>
          {item.cta && <p className="text-sm text-blue-500">{item.cta}</p>}
          {item.hashtags.length > 0 && (
            <p className="text-sm text-blue-500">
              {item.hashtags.slice(0, 3).join(" ")}
            </p>
          )}
        </div>
        <div className="flex gap-8 text-xs text-muted-foreground pt-2 border-t">
          <span>Reply</span>
          <span>Repost</span>
          <span>Like</span>
          <span>Share</span>
        </div>
      </div>
    </PhoneFrame>
  );
}

function EmailPreview({ item }: { item: ContentItem }) {
  return (
    <div className="mx-auto w-[400px] rounded-lg border bg-white dark:bg-gray-950 shadow-lg overflow-hidden">
      <div className="border-b p-4 space-y-1 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-muted-foreground">Subject:</p>
        <p className="text-sm font-semibold">{item.hook || "Email Subject"}</p>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm whitespace-pre-wrap">{item.body}</p>
        {item.cta && (
          <div className="text-center pt-2">
            <span className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium">
              {item.cta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BlogPreview({ item }: { item: ContentItem }) {
  return (
    <div className="mx-auto w-[500px] rounded-lg border bg-white dark:bg-gray-950 shadow-lg overflow-hidden">
      <div className="p-8 space-y-4">
        <h1 className="text-xl font-bold">{item.hook || item.topic}</h1>
        <div className="flex gap-2">
          <Badge variant="secondary">{item.pillar}</Badge>
          {item.hashtags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{item.body}</p>
        </div>
        {item.cta && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-primary">{item.cta}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS: Record<string, React.ComponentType<{ item: ContentItem }>> = {
  tiktok: TikTokPreview,
  instagram: InstagramPreview,
  twitter: TwitterPreview,
  email: EmailPreview,
  blog: BlogPreview,
};

export function ContentPreviewModal({
  item,
  open,
  onOpenChange,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const PreviewComponent = PREVIEW_COMPONENTS[item.platform] || TwitterPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{item.platform} Preview</DialogTitle>
          <DialogDescription>
            Approximate preview of how your content will look on {item.platform}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center overflow-y-auto max-h-[70vh]">
          <PreviewComponent item={item} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
