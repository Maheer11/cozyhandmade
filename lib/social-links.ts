export const socialLinks = {
  instagram: "https://www.instagram.com/cozi_handmade.ie?igsh=NTRzZjVtd2QyNW8y&utm_source=qr",
  facebook: "https://www.facebook.com/share/19AGprZvUk/?mibextid=wwXIfr",
  tiktok: "https://www.tiktok.com/@cozi_handmade?_r=1&_t=ZS-97ypV59XJJ7",
  whatsappNumber: "353892002517",
} as const;

export const whatsappLink = (message?: string) =>
  `https://wa.me/${socialLinks.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
