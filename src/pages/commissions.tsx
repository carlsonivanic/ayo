import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Deprecated. The financial reports now live at /reports. This route is kept as
 * a 301-style redirect so existing bookmarks and links land on the new hub.
 */
export default function CommissionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/reports");
  }, [router]);
  return null;
}
