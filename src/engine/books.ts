import booksJson from '../content/generated/books.json'
export const BOOKS = booksJson as { id: number; name: string; testament: 'OT' | 'NT'; chapters: number }[]
export const bookName = (id: number) => BOOKS.find((b) => b.id === id)?.name ?? ''
