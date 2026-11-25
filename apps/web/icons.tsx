/** Line drawings for the tabs of the info panel. */
const paths = {
  story: 'M12 6.6C10 5.1 7 4.6 3.5 5.1v13.2c3.5-.5 6.5 0 8.5 1.4 2-1.4 5-1.9 8.5-1.4V5.1C17 4.6 14 5.1 12 6.6ZM12 6.6v13.1',
  map: 'M3.5 6.6 9 4.5l6 2.1 5.5-2.1v12.9L15 19.5l-6-2.1-5.5 2.1ZM9 4.5v12.9M15 6.6v12.9',
  me: 'M12 11.6a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8ZM4.6 20.2c.6-4 3.6-6 7.4-6s6.8 2 7.4 6',
  bag: 'M8.6 8.4V7a3.4 3.4 0 0 1 6.8 0v1.4M5.6 8.4h12.8l1.1 11.2h-15ZM9.2 12.4h5.6',
  crew: 'M12 3.2v11.6M12 4.6c3.6 1.2 5.3 4 5.6 7.2H12M12 6.4c-2.6.9-4.3 2.9-5 5.4h5M3.4 14.8h17.2l-2.6 5H6Z',
  news: 'M3.8 5h13v14.2H6.2a2.4 2.4 0 0 1-2.4-2.4ZM16.8 9h3.4v7.8a2.4 2.4 0 0 1-2.4 2.4h-1M6.8 8.6h7M6.8 12h7M6.8 15.4h4.4',
  luffy: 'M2.6 15.6c0-1.7 4.2-2.9 9.4-2.9s9.4 1.2 9.4 2.9-4.2 2.8-9.4 2.8-9.4-1.1-9.4-2.8ZM6.4 13.2C6.6 8.6 8.9 5.8 12 5.8s5.4 2.8 5.6 7.4M6.6 11.3c3 1.3 7.8 1.3 10.8 0',
}
export type IconName = keyof typeof paths

export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>
}
