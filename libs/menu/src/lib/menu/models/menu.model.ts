export interface MenuItem {
  id: number;
  nombre: string;
  ruta?: string;
  icono?: string;
  menuPadreId?: number;
}

export interface MenuAgrupado extends MenuItem {
  hijos: MenuItem[];
}
