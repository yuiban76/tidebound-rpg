import { memo } from 'react'
import type { ReactNode } from 'react'
import type { IslandId } from '../../packages/shared/protocol.ts'
import { chartIslands, coastline } from '../../packages/world/seachart.ts'
import type { Biome } from '../../packages/world/seachart.ts'

/** Land, its shaded side, and the shallow water around it. */
export const biomes: Record<Biome, { land: string, shade: string, shore: string }> = {
  green: { land: '#c3d596', shade: '#9ab670', shore: '#e9dfb4' },
  town: { land: '#dccfa9', shade: '#bba879', shore: '#efe6c8' },
  desert: { land: '#efd79a', shade: '#d3b06a', shore: '#f7ebc6' },
  snow: { land: '#f4f8f8', shade: '#c6d8df', shore: '#e3edee' },
  jungle: { land: '#9dc184', shade: '#6f9b5e', shore: '#e3dcae' },
  stone: { land: '#d6d2c3', shade: '#a9a594', shore: '#e8e4d2' },
  dark: { land: '#8d8a9c', shade: '#615f73', shore: '#b9b6c2' },
  cloud: { land: '#ffffff', shade: '#d5e4ee', shore: '#f3f8fb' },
  sea: { land: '#a8ccd0', shade: '#7fb0b8', shore: '#c9e0df' },
}

const Palm = ({ x, y, s = 1 }: { x: number, y: number, s?: number }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M0 0Q2 -8 -1 -15" fill="none" stroke="#7a5a35" strokeWidth="2.4"/>
  <path d="M-1 -15Q-9 -19 -12 -12Q-6 -15 -1 -15Q-4 -22 -10 -22Q-3 -23 -1 -15Q4 -23 10 -20Q3 -19 -1 -15Q7 -16 10 -9Q4 -13 -1 -15" fill="#4f8a4a" stroke="#2f5b35" strokeWidth=".8"/>
</g>
const House = ({ x, y, s = 1, roof = '#b5573f' }: { x: number, y: number, s?: number, roof?: string }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M-6 0V-7H6V0Z" fill="#f6efdc"/><path d="M-8 -7L0 -14L8 -7Z" fill={roof}/><path d="M-1.5 0V-4H1.5V0Z" fill="#6b5237"/>
</g>
const Flag = ({ x, y, color }: { x: number, y: number, color: string }) => <g transform={`translate(${x} ${y})`}>
  <path d="M0 0V-12" fill="none"/><path d="M0 -12L9 -9.5L0 -7Z" fill={color}/>
</g>

// One small drawing per island, about 50 units wide around (0, 0), feet at y = 12.
const landmarks: Record<IslandId, ReactNode> = {
  // The New World.
  fishmanIsland: <><path d="M-26 12Q-24 -24 0 -26Q24 -24 26 12Z" fill="#e3f4f8" fillOpacity=".55" stroke="#7fb3c2"/><path d="M-14 12V-2H14V12Z" fill="#f6e7c8"/>
    <path d="M-6 -2V-14H6V-2Z" fill="#fff3dc"/><path d="M-8 -14Q0 -22 8 -14Z" fill="#e58c7a"/><path d="M-18 12Q-20 2 -14 -2M18 12Q21 3 16 -1" fill="none" stroke="#e0708a" strokeWidth="2.2"/>
    <circle cx="-17" cy="-12" r="2.4" fill="#fff" fillOpacity=".8"/><circle cx="15" cy="-16" r="1.8" fill="#fff" fillOpacity=".8"/></>,
  punkHazard: <><path d="M-26 12L-20 -6L-12 2L-6 -14L0 12Z" fill="#c9653b"/><path d="M-18 -6Q-16 -16 -12 -10Q-10 -18 -6 -12" fill="none" stroke="#f0a43a" strokeWidth="2"/>
    <path d="M0 12L4 -12L10 0L16 -18L26 12Z" fill="#e8f2f5"/><path d="M4 -12L7 -4M16 -18L19 -6" fill="none" stroke="#9fc3cf" strokeWidth="1.4"/></>,
  dressrosa: <><path d="M-26 12Q-12 2 0 6Q12 0 26 12Z" fill="#e6c98a"/><ellipse cx="-11" cy="4" rx="11" ry="6" fill="#d8b27c"/><ellipse cx="-11" cy="2" rx="7" ry="3" fill="#a9713f"/>
    <path d="M6 6V-12H20V6Z" fill="#fbf3e4"/><path d="M4 -12L13 -22L22 -12Z" fill="#e07a8a"/><Flag x={13} y={-22} color="#e8d64a"/></>,
  zou: <><path d="M-24 12V-2Q-24 -14 -8 -14H10Q22 -14 22 -2V12H16V2H-18V12Z" fill="#a8a59a"/><path d="M22 -4Q30 -2 28 10" fill="none" stroke="#a8a59a" strokeWidth="5" strokeLinecap="round"/>
    <path d={coastline('zouforest', -2, -17, 18, 6, .3, 10)} fill="#6f9b5e"/><circle cx="14" cy="-6" r="1.4" fill="#33403d"/></>,
  wholeCake: <><path d="M-20 12V2H20V12Z" fill="#f6d7e2"/><path d="M-14 2V-8H14V2Z" fill="#fbe9c8"/><path d="M-8 -8V-17H8V-8Z" fill="#f6d7e2"/>
    <path d="M-20 2Q-15 6 -10 2Q-5 6 0 2Q5 6 10 2Q15 6 20 2M-14 -8Q-9 -4 -4 -8Q1 -4 6 -8Q10 -4 14 -8" fill="none" stroke="#fff" strokeWidth="1.6"/>
    <circle cx="0" cy="-20" r="3" fill="#d6433a"/></>,
  wano: <><path d="M-26 12Q-16 0 -2 6Q12 -2 26 12Z" fill="#7fa65c"/><path d="M-4 6V-4H12V6Z" fill="#fbf6e8"/><path d="M-8 -4L4 -10L16 -4Z" fill="#3b3748"/>
    <path d="M-1 -10V-16H9V-10Z" fill="#fbf6e8"/><path d="M-4 -16L4 -21L12 -16Z" fill="#3b3748"/><path d="M-22 12V-6M-14 12V-6M-25 -6H-11M-24 -3H-12" fill="none" stroke="#c8412f" strokeWidth="2.2"/></>,
  egghead: <><path d="M-24 12Q-10 4 0 8Q12 2 24 12Z" fill="#d6d2c3"/><ellipse cx="0" cy="-8" rx="11" ry="15" fill="#fffaf0"/><path d="M-11 -6Q0 -1 11 -6" fill="none" stroke="#e0a43a" strokeWidth="1.8"/>
    <path d="M14 10V-12H19V10Z" fill="#b9c8cf"/><circle cx="16.5" cy="-15" r="3.2" fill="#ffd968"/><path d="M-20 10V-2H-15V10Z" fill="#b9c8cf"/></>,

  wind: <><path d="M-24 11Q-14 -6 -3 8Z" fill="#9ab670"/><path d="M5 12L8 -9H15L18 12Z" fill="#f6efdc"/><path d="M7 -9L11.5 -15L16 -9Z" fill="#b5573f"/>
    <path d="M11.5 -10L11.5 -26L16 -24L16 -14ZM11.5 -10L27 -10L25 -5.5L15 -5.5ZM11.5 -10L11.5 6L7 4L7 -5ZM11.5 -10L-4 -10L-2 -14.5L8 -14.5Z" fill="#fffaf0"/><circle cx="11.5" cy="-10" r="1.8" fill="#6b5237"/><House x={-12} y={12}/></>,
  shells: <><path d="M-20 12V-4H20V12Z" fill="#eef1ee"/><path d="M-20 -4V-8H-15V-4M-10 -4V-8H-5V-4M5 -4V-8H10V-4M15 -4V-8H20V-4" fill="#eef1ee"/><path d="M-7 12V-18H7V12Z" fill="#dfe6e8"/><path d="M-9 -18L0 -25L9 -18Z" fill="#3f6d92"/><path d="M-3 12V4Q0 0 3 4V12Z" fill="#5b4a37"/><Flag x={0} y={-25} color="#4a86b8"/></>,
  orange: <><path d="M-20 12L-16 -4Q0 -10 16 -4L20 12Z" fill="#f7efe1"/><path d="M-20 12L-16 -4Q-12 -6 -9 -6.6L-10 12ZM-4 12L-3.5 -8H3.5L4 12ZM10 12L9 -6.6Q12 -6 16 -4L20 12Z" fill="#cf5640"/><path d="M-17 -4L0 -22L17 -4Q0 -10 -17 -4Z" fill="#e39a3b"/><Flag x={0} y={-22} color="#cf5640"/></>,
  syrup: <><path d="M-26 12Q-10 -8 6 6Q16 -2 26 12Z" fill="#9ab670"/><path d="M0 6V-8H20V6Z" fill="#fbf6e8"/><path d="M-2 -8L3 -16H17L22 -8Z" fill="#7d6a9c"/><path d="M4 -4H8V0H4ZM12 -4H16V0H12Z" fill="#a9ccd6"/><path d="M8 6V1H12V6Z" fill="#6b5237"/><House x={-13} y={11} s={.8}/></>,
  baratie: <><path d="M-26 2Q0 10 26 2L18 13Q0 18 -18 13Z" fill="#7b4c32"/><path d="M-18 4V-6H18V4Q0 8 -18 4Z" fill="#f3ead2"/><path d="M-20 -6Q0 -12 20 -6L16 -11Q0 -16 -16 -11Z" fill="#c65a44"/><path d="M-10 -12V-19H10V-12Q0 -15 -10 -12Z" fill="#f3ead2"/><path d="M-12 -19L0 -26L12 -19Z" fill="#c65a44"/><path d="M26 2Q34 -6 30 -12Q25 -8 22 -1Z" fill="#8fb1b5"/><path d="M-26 2Q-35 -3 -32 -11Q-26 -7 -22 0Z" fill="#8fb1b5"/><path d="M-12 -2H-8V2H-12ZM-2 -2H2V3H-2ZM8 -2H12V2H8Z" fill="#e7b95c"/></>,
  cocoyasi: <><path d="M-2 12Q0 2 -3 -6H5Q2 2 4 12Z" fill="#8a6239"/><path d={coastline('tree', 1, -13, 19, 13, .18, 10)} fill="#5f9350"/><g fill="#f0922e" strokeWidth=".8"><circle cx="-8" cy="-14" r="2.6"/><circle cx="1" cy="-19" r="2.6"/><circle cx="10" cy="-13" r="2.6"/><circle cx="3" cy="-9" r="2.6"/><circle cx="-5" cy="-7" r="2.2"/></g><House x={-19} y={12} s={.9}/></>,
  loguetown: <><House x={-20} y={12}/><House x={20} y={12} roof="#58788a"/><path d="M-10 12L-7 -14M10 12L7 -14M-9 4L8 -6M9 4L-8 -6" fill="none" stroke="#6b4a2c" strokeWidth="2.4"/><path d="M-12 -14H12V-10H-12Z" fill="#a87c4b"/><path d="M-12 -14V-19M12 -14V-19M-12 -18H12" fill="none" stroke="#6b4a2c"/><path d="M4 -14V-30M4 -30H-5V-26" fill="none" stroke="#4a3522" strokeWidth="2"/></>,
  twinCape: <><path d="M-24 12Q-16 -4 -4 2L2 12Z" fill="#a9a594"/><path d="M-13 1L-11 -22H-5L-3 1Z" fill="#fbf6e8"/><path d="M-12.4 -6L-12 -12H-4L-3.6 -6Z" fill="#c65a44"/><path d="M-13 -22H-3L-8 -29Z" fill="#c65a44"/><path d="M-3 -24L16 -30V-19Z" fill="#fbe9a6" stroke="none" opacity=".85"/><path d="M8 14Q12 2 24 4Q32 8 30 14Z" fill="#4e6e82"/><path d="M19 4Q20 -3 14 -4M19 4Q20 -4 25 -4" fill="none" stroke="#7fb0c4" strokeWidth="1.8"/></>,
  whiskyPeak: <><path d="M-26 12Q-24 -14 -14 -14Q-4 -14 -3 12Z" fill="#9db473"/><path d="M-2 12Q0 -24 11 -24Q22 -24 25 12Z" fill="#88a562"/><path d="M-18 -10V8M-12 -12V9M5 -20V8M12 -23V9M18 -18V8" stroke="#5f7d46" strokeDasharray="2 4"/><House x={-8} y={12} s={.8}/><House x={4} y={12} s={.8} roof="#58788a"/></>,
  littleGarden: <><path d="M-22 12L-6 -18H2L18 12Z" fill="#8a7360"/><path d="M-6 -18L-3 -12L-1 -16L2 -18Z" fill="#e0673c"/><path d={coastline('smoke', 0, -25, 8, 5, .3, 8)} fill="#e7e3da"/><path d="M10 12Q9 2 16 0Q22 -1 23 -10Q23 -17 29 -16Q33 -14 28 -13Q27 -5 26 4Q25 12 24 12Z" fill="#6f9b5e"/><Palm x={-18} y={12}/></>,
  drum: <><path d="M-24 12V-8Q-17 -14 -11 -8V12Z" fill="#dfeaee"/><path d="M-9 12V-24Q1 -32 11 -24V12Z" fill="#eef5f7"/><path d="M13 12V-4Q19 -10 25 -4V12Z" fill="#dfeaee"/><path d="M-9 -24Q1 -32 11 -24Q6 -20 1 -23Q-4 -19 -9 -24Z" fill="#fff"/><path d="M-3 -26V-32H-1V-30H3V-32H5V-26Z" fill="#8793a6"/><g fill="#f3a9c4" stroke="none"><circle cx="-18" cy="-20" r="1.6"/><circle cx="18" cy="-16" r="1.6"/><circle cx="20" cy="-28" r="1.4"/><circle cx="-14" cy="-30" r="1.4"/><circle cx="-24" cy="-14" r="1.2"/></g></>,
  alabasta: <><path d="M-28 12Q-16 0 -4 9Q10 0 28 12Z" fill="#d9b671"/><path d="M-14 10V-6H14V10Z" fill="#f8ecd0"/><path d="M-7 -6Q-8 -18 0 -22Q8 -18 7 -6Z" fill="#5aa39b"/><path d="M0 -22V-27" fill="none"/><path d="M-20 10V-10H-15V10ZM15 10V-10H20V10Z" fill="#f2e1ba"/><path d="M-21 -10L-17.5 -16L-14 -10ZM14 -10L17.5 -16L21 -10Z" fill="#5aa39b"/><path d="M-3 10V2Q0 -2 3 2V10Z" fill="#9a7444"/></>,
  jaya: <><path d="M-24 12Q-8 -4 10 4Q20 2 26 12Z" fill="#86ac6c"/><Palm x={-12} y={8} s={1.2}/><Palm x={14} y={9}/><House x={1} y={10} s={.9} roof="#8a6a3d"/></>,
  skypiea: <><path d="M-27 12Q-33 2 -22 0Q-21 -10 -10 -7Q-2 -16 8 -8Q20 -12 22 -1Q33 1 27 12Z" fill="#fff"/><path d="M-9 -9Q-9 -24 0 -25Q9 -24 9 -9L12 -6H-12Z" fill="#edc24b"/><circle cx="0" cy="-5" r="2.4" fill="#b98c22"/><path d="M-18 6Q-12 2 -7 6M4 7Q10 3 16 7" fill="none" stroke="#b7cddb"/></>,
  water7: <><path d="M-27 12V4H27V12Z" fill="#d9c79b"/><path d="M-20 4V-4H20V4Z" fill="#e8dab3"/><path d="M-13 -4V-12H13V-4Z" fill="#f1e6c6"/><path d="M-6 -12V-19H6V-12Z" fill="#f8f0d8"/><path d="M0 -19Q-9 -32 -12 -20M0 -19Q9 -32 12 -20M0 -19V-29" fill="none" stroke="#3f95b5" strokeWidth="2"/><path d="M-10 -12V12M10 -12V12" stroke="#6bb5c8" strokeWidth="2.6"/><path d="M-22 8H-18M18 8H22M-15 0H-13M14 0H16" stroke="#8a6a3d" strokeWidth="2"/></>,
  eniesLobby: <><path d="M-28 12V4Q0 -4 28 4V12Z" fill="#c9c5b5"/><path d="M-8 3V-16H-2V3ZM2 3V-22H10V3Z" fill="#f1eee2"/><path d="M-9 -16L-5 -22L-1 -16ZM1 -22L6 -29L11 -22Z" fill="#5d7587"/><Flag x={6} y={-28} color="#f4f7f8"/><path d="M-24 4V14M-20 3V14M18 3V14M22 4V14" stroke="#6bb5c8" strokeWidth="2.4"/><path d="M14 4V-8H26V4" fill="#e3dfd0"/><path d="M14 -8L20 -14L26 -8Z" fill="#5d7587"/></>,
  thrillerBark: <><path d="M-28 2H28L20 14H-20Z" fill="#4a4558"/><path d="M-10 2V-10H12V2Z" fill="#6f6a80"/><path d="M-12 -10L-4 -18L1 -11L8 -20L14 -10Z" fill="#3b3748"/><path d="M-18 2V-24M20 2V-20" stroke="#2c2936" strokeWidth="2"/><path d="M-18 -23Q-6 -18 -18 -6Q-14 -14 -18 -23ZM20 -19Q30 -14 20 -4Q23 -12 20 -19Z" fill="#575168"/><path d="M-4 -4H0V2H-4ZM5 -4H8V0H5Z" fill="#e7c65c"/><circle cx="22" cy="-27" r="5" fill="#f3e7b2"/></>,
  sabaody: <><path d="M-26 12Q-18 4 -16 -6L-12 -6Q-12 4 -8 12ZM-4 12Q0 2 0 -10L6 -10Q6 2 10 12ZM14 12Q17 5 17 -3L21 -3Q22 6 27 12Z" fill="#9b7a4d"/><path d={coastline('mg1', -14, -11, 11, 7, .2, 9)} fill="#6fa863"/><path d={coastline('mg2', 3, -16, 13, 8, .2, 9)} fill="#7fb571"/><path d={coastline('mg3', 19, -7, 10, 6, .2, 9)} fill="#6fa863"/><g fill="#d9f2f5" fillOpacity=".75" stroke="#6ba9b5" strokeWidth=".9"><circle cx="-24" cy="-24" r="4"/><circle cx="-8" cy="-30" r="3"/><circle cx="18" cy="-24" r="5"/><circle cx="29" cy="-17" r="2.6"/><circle cx="9" cy="-32" r="2"/></g></>,
  amazonLily: <><path d="M-25 12L-12 -14L-4 -6L4 -22L14 -8L26 12Z" fill="#7fa96a"/><path d="M4 -22L-1 -10L9 -11Z" fill="#a9c893"/><path d="M0 12Q-11 8 -10 -2Q-4 0 0 4Q4 0 10 -2Q11 8 0 12ZM0 4Q-5 -3 0 -8Q5 -3 0 4Z" fill="#e58aa5"/></>,
  impelDown: <><ellipse cx="0" cy="9" rx="27" ry="7" fill="#55526a"/><path d="M-18 9V-6H18V9Q0 14 -18 9Z" fill="#7c7990"/><path d="M-18 -6V-10H-12V-6H-6V-10H0V-6H6V-10H12V-6H18" fill="#7c7990"/><path d="M-6 -7V-22H6V-7Z" fill="#6a677e"/><path d="M-8 -22L0 -29L8 -22Z" fill="#3b3748"/><path d="M-4 11V3Q0 -2 4 3V11Z" fill="#23212e"/><path d="M-2 11V2M0 11V1M2 11V2" stroke="#a5a2b5" strokeWidth=".9"/></>,
  marineford: <><path d="M-28 12Q-26 -2 -14 -2H14Q26 -2 28 12Q14 6 0 12Q-14 6 -28 12Z" fill="#e9e6da"/><path d="M-14 -2V-12H14V-2Z" fill="#f6f4ea"/><path d="M-17 -12L-11 -17H11L17 -12Z" fill="#4a7897"/><path d="M-8 -17V-23H8V-17Z" fill="#f6f4ea"/><path d="M-11 -23L-6 -28H6L11 -23Z" fill="#4a7897"/><path d="M-4 -2V-8H4V-2Z" fill="#4a7897"/><Flag x={0} y={-28} color="#4a86b8"/></>,
}

/** An island on the sea chart: shallow water, land and its landmark. */
export const IslandArt = memo(function IslandArt({ id }: { id: IslandId }) {
  const { biome } = chartIslands[id]
  const { land, shade, shore } = biomes[biome]
  const cloud = biome === 'cloud'
  return <g strokeLinejoin="round" strokeLinecap="round">
    {!cloud && <path d={coastline(id, 0, 8, 47, 27, .22)} fill="#ffffff" opacity=".35"/>}
    <path d={coastline(id, 0, 8, 41, 22, .22)} fill={cloud ? '#e6f1f6' : shore} stroke={cloud ? 'none' : '#8f8254'} strokeOpacity=".55"/>
    <path d={coastline(id, 0, 9, 36, 18, .22)} fill={shade}/>
    <path d={coastline(id, 0, 7, 36, 17, .22)} fill={land}/>
    <g stroke="#33403d" strokeWidth="1.25">{landmarks[id]}</g>
  </g>
})

/** A straw hat: where Luffy is. */
export const StrawHat = () => <g stroke="#5b4420" strokeWidth="1.4" strokeLinejoin="round">
  <path d="M-9 2Q-9 -10 0 -10Q9 -10 9 2Z" fill="#f0cb63"/><path d="M-9.3 1.5Q0 5 9.3 1.5L9 -2.6Q0 .8 -9 -2.6Z" fill="#c8412f"/><ellipse cx="0" cy="3.4" rx="16" ry="3.8" fill="#f0cb63"/>
  <path d="M-9.3 1.5Q0 5 9.3 1.5L9 -2.6Q0 .8 -9 -2.6Z" fill="#c8412f"/>
</g>

/** The party's ship. */
export const ShipMark = () => <g stroke="#3d2c1a" strokeWidth="1.4" strokeLinejoin="round">
  <path d="M-13 4H13L8 12H-8Z" fill="#8a5a33"/><path d="M0 4V-16" fill="none"/><path d="M1 -15Q13 -8 1 1Z" fill="#fffaf0"/><path d="M-1 -13Q-10 -7 -1 1Z" fill="#f3e6c3"/>
</g>
