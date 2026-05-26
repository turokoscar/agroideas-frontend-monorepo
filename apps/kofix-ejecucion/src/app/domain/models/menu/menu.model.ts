export interface MenuItem {
    id: number;
    nombre: string;
    descripcion?: string;
    icono?: string;
    ruta?: string;
    menuPadreId?: number;
    orden: number;
    esHijo?: number;
}

export interface MenuAgrupado {
    id: number;
    nombre: string;
    descripcion?: string;
    icono?: string;
    ruta?: string;
    orden: number;
    hijos: MenuItem[];
}
