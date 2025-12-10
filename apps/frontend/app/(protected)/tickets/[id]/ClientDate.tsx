"use client";

export default function ClientDate({ date }: { date: Date }) {
  return <span>{new Date(date).toLocaleString()}</span>;
}
