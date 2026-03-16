import { createClient, type WebDAVClient } from "webdav";

export interface NextcloudConfig {
  url: string;
  user: string;
  password: string;
}

export const getNextcloudConfig = (): NextcloudConfig => {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!url || !user || !password) {
    throw new Error(
      "Nextcloud configuration is missing. Please set NEXTCLOUD_URL, NEXTCLOUD_USER, and NEXTCLOUD_PASSWORD environment variables.",
    );
  }

  return { url, user, password };
};

export const getClient = (): WebDAVClient => {
  const { url, user, password } = getNextcloudConfig();
  const normalizedUrl = url.replace(/\/+$/, "");
  const clientUrl = `${normalizedUrl}/remote.php/dav/files/${encodeURIComponent(user)}`;

  return createClient(clientUrl, {
    username: user,
    password,
  });
};
