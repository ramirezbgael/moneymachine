import React from 'react'
import {
  FaBox,
  FaShoppingBag,
  FaCoffee,
  FaAppleAlt,
  FaBreadSlice,
  FaCheese,
  FaFish,
  FaDrumstickBite,
  FaTint,
  FaWineBottle,
  FaBeer,
  FaIceCream,
  FaCookie,
  FaPizzaSlice,
  FaHamburger,
  FaHotdog,
  FaCarrot,
  FaLemon,
  FaPepperHot,
  FaCandyCane,
  FaGlassWhiskey,
  FaMugHot,
  FaBlender,
  FaUtensils,
  FaWrench,
  FaTools,
  FaTshirt,
  FaShoePrints,
  FaBook,
  FaPen,
  FaLaptop,
  FaMobileAlt,
  FaGamepad,
  FaMusic,
  FaCamera,
  FaBasketballBall,
  FaBriefcase,
} from 'react-icons/fa'

export interface ProductIcon {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

export const PRODUCT_ICONS: ProductIcon[] = [
  { id: 'box', icon: FaBox, label: 'Caja' },
  { id: 'shopping-bag', icon: FaShoppingBag, label: 'Bolsa' },
  { id: 'coffee', icon: FaCoffee, label: 'Café' },
  { id: 'apple', icon: FaAppleAlt, label: 'Manzana' },
  { id: 'bread', icon: FaBreadSlice, label: 'Pan' },
  { id: 'cheese', icon: FaCheese, label: 'Queso' },
  { id: 'fish', icon: FaFish, label: 'Pescado' },
  { id: 'chicken', icon: FaDrumstickBite, label: 'Pollo' },
  { id: 'water', icon: FaTint, label: 'Agua' },
  { id: 'wine', icon: FaWineBottle, label: 'Vino' },
  { id: 'beer', icon: FaBeer, label: 'Cerveza' },
  { id: 'ice-cream', icon: FaIceCream, label: 'Helado' },
  { id: 'cookie', icon: FaCookie, label: 'Galleta' },
  { id: 'pizza', icon: FaPizzaSlice, label: 'Pizza' },
  { id: 'burger', icon: FaHamburger, label: 'Hamburguesa' },
  { id: 'hotdog', icon: FaHotdog, label: 'Hot Dog' },
  { id: 'carrot', icon: FaCarrot, label: 'Zanahoria' },
  { id: 'lemon', icon: FaLemon, label: 'Limón' },
  { id: 'pepper', icon: FaPepperHot, label: 'Chile' },
  { id: 'candy', icon: FaCandyCane, label: 'Dulce' },
  { id: 'whiskey', icon: FaGlassWhiskey, label: 'Whiskey' },
  { id: 'mug', icon: FaMugHot, label: 'Taza' },
  { id: 'blender', icon: FaBlender, label: 'Licuadora' },
  { id: 'utensils', icon: FaUtensils, label: 'Cubiertos' },
  { id: 'wrench', icon: FaWrench, label: 'Llave' },
  { id: 'tools', icon: FaTools, label: 'Herramientas' },
  { id: 'tshirt', icon: FaTshirt, label: 'Camiseta' },
  { id: 'shoes', icon: FaShoePrints, label: 'Zapatos' },
  { id: 'book', icon: FaBook, label: 'Libro' },
  { id: 'pen', icon: FaPen, label: 'Pluma' },
  { id: 'laptop', icon: FaLaptop, label: 'Laptop' },
  { id: 'phone', icon: FaMobileAlt, label: 'Teléfono' },
  { id: 'gamepad', icon: FaGamepad, label: 'Videojuego' },
  { id: 'music', icon: FaMusic, label: 'Música' },
  { id: 'camera', icon: FaCamera, label: 'Cámara' },
  { id: 'basketball', icon: FaBasketballBall, label: 'Balón' },
  { id: 'briefcase', icon: FaBriefcase, label: 'Maletín' },
]

export function getProductIcon(iconId?: string | null): React.ComponentType<{ className?: string }> {
  if (!iconId) return FaBox
  const found = PRODUCT_ICONS.find((i) => i.id === iconId)
  return found ? found.icon : FaBox
}

interface IconPickerProps {
  value?: string | null
  onChange: (iconId: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-2 rounded-2xl bg-[var(--panel-2)]/50">
      {PRODUCT_ICONS.map((item) => {
        const Icon = item.icon
        const isSelected = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-[var(--accent)] text-black shadow-md shadow-[var(--accent)]/30'
                : 'bg-[var(--panel)]/60 text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--accent)]'
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
          </button>
        )
      })}
    </div>
  )
}
