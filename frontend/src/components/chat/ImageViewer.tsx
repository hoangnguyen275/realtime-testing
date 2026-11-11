import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, Share2, X } from "lucide-react";
import { toast } from "sonner";

interface ImageViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cloudinary: the fl_attachment flag makes the browser download the file instead of opening it
const toDownloadUrl = (url: string) => url.replace("/upload/", "/upload/fl_attachment/");

const iconButton =
  "flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white";

const ImageViewer = ({ src, alt = "Image", open, onOpenChange }: ImageViewerProps) => {
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: src, title: alt });
        return;
      }
      await navigator.clipboard.writeText(src);
      toast.success("Image link copied");
    } catch (error) {
      // closing the share sheet throws AbortError; that is not a failure
      if ((error as Error).name !== "AbortError") {
        toast.error("Could not share the image.");
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          // a click on the dark area around the image closes the viewer
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>

          <div className="absolute top-4 right-4 flex gap-3">
            <a
              href={toDownloadUrl(src)}
              download
              aria-label="Download image"
              title="Download"
              className={iconButton}
            >
              <Download className="size-5" />
            </a>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share image"
              title="Share"
              className={iconButton}
            >
              <Share2 className="size-5" />
            </button>
            <DialogPrimitive.Close
              aria-label="Close"
              title="Close"
              className={iconButton}
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] max-w-[92vw] rounded-md object-contain shadow-2xl"
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ImageViewer;
