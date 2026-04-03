export const AVATAR_MAP: Record<string, string> = {
  piano: "\u{1F3B9}",
  guitar: "\u{1F3B8}",
  music: "\u{1F3B5}",
  mic: "\u{1F3A4}",
  drum: "\u{1F941}",
  star: "\u2B50",
  heart: "\u2764\uFE0F",
  fire: "\u{1F525}",
  sun: "\u2600\uFE0F",
  moon: "\u{1F319}",
  flower: "\u{1F338}",
  cat: "\u{1F431}",
  dog: "\u{1F436}",
  bear: "\u{1F43B}",
  penguin: "\u{1F427}",
  butterfly: "\u{1F98B}",
  rainbow: "\u{1F308}",
  gem: "\u{1F48E}",
  trophy: "\u{1F3C6}",
  rocket: "\u{1F680}",
};

const AVATAR_KEYS = Object.keys(AVATAR_MAP);

interface Props {
  selected: string;
  onSelect: (key: string) => void;
}

export function AvatarPicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {AVATAR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all ${
            selected === key
              ? "bg-purple-base ring-2 ring-purple-light scale-110"
              : "bg-n-700 hover:bg-n-600"
          }`}
        >
          {AVATAR_MAP[key]}
        </button>
      ))}
    </div>
  );
}
