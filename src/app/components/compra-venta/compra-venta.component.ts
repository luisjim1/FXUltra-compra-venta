import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ParDivisa {
  id: number;
  nombre: string;
  descripcion: string;
  seleccionado?: boolean;
}

interface FechaLiquidacion {
  id: number;
  descripcion: string;
}

type Divisa = 'USD' | 'EUR';

@Component({
  selector: 'app-compra-venta',
  templateUrl: './compra-venta.component.html',
  styleUrls: ['./compra-venta.component.css']
})
export class CompraVentaComponent implements OnInit, OnDestroy {
  pares: ParDivisa[] = [];
  paresDivisas: ParDivisa[] = [];

  fechasUSD: FechaLiquidacion[] = [];
  fechasEUR: FechaLiquidacion[] = [];

  tipoOperacionUSD: string | null = null;
  tipoOperacionEUR: string | null = null;

  entregoUSD: string = '';
  entregoEUR: string = '';

  reciboUSD: string = '';
  reciboEUR: string = '';

  fechaActual: string = '';

  inputFocus: Record<Divisa, boolean> = {
    USD: false,
    EUR: false
  };

  selectFocus: Record<Divisa, boolean> = {
    USD: false,
    EUR: false
  };

  mostrarConfirmacionUSD: boolean = false;
  mostrarConfirmacionEUR: boolean = false;

  mostrarEntregoUSD: boolean = false;
  mostrarEntregoEUR: boolean = false;

  tasaVentaUSD = 18.7019;
  tasaCompraUSD = 18.8249;
  tasaVentaEUR = 21.7793;
  tasaCompraEUR = 21.7820;

  tasaVentaUSDEntero = '';
  tasaVentaUSDDec = '';
  tasaCompraUSDEntero = '';
  tasaCompraUSDDec = '';
  tasaVentaEUREntero = '';
  tasaVentaEURDec = '';
  tasaCompraEUREntero = '';
  tasaCompraEURDec = '';

  private simuladorInterval: any;

  // Variables para validación de límite máximo
  readonly LIMITE_MAXIMO = 5000000;
  errorMontoUSD: boolean = false;
  errorMontoEUR: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fechaActual = this.obtenerFechaActual();
    this.obtenerParesDivisas();
    this.procesarTasas();

    this.simuladorInterval = setInterval(() => {
      this.simularPreciosDivisas();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.simuladorInterval) clearInterval(this.simuladorInterval);
  }

  procesarTasas() {
    const splitDec = (valor: number) => {
      const partes = valor.toFixed(4).split('.');
      return {
        entero: partes[0],
        dec: '.' + partes[1]
      };
    };
    const usdVenta = splitDec(this.tasaVentaUSD);
    const usdCompra = splitDec(this.tasaCompraUSD);
    const eurVenta = splitDec(this.tasaVentaEUR);
    const eurCompra = splitDec(this.tasaCompraEUR);

    this.tasaVentaUSDEntero = usdVenta.entero;
    this.tasaVentaUSDDec = usdVenta.dec;
    this.tasaCompraUSDEntero = usdCompra.entero;
    this.tasaCompraUSDDec = usdCompra.dec;
    this.tasaVentaEUREntero = eurVenta.entero;
    this.tasaVentaEURDec = eurVenta.dec;
    this.tasaCompraEUREntero = eurCompra.entero;
    this.tasaCompraEURDec = eurCompra.dec;
  }

  simularPreciosDivisas() {
    this.tasaVentaUSD = this.ajustarValor(this.tasaVentaUSD, 0.002);
    this.tasaCompraUSD = this.ajustarValor(this.tasaCompraUSD, 0.002);
    this.tasaVentaEUR = this.ajustarValor(this.tasaVentaEUR, 0.002);
    this.tasaCompraEUR = this.ajustarValor(this.tasaCompraEUR, 0.002);

    this.procesarTasas();

    if (this.mostrarEntregoUSD && this.reciboUSD && this.tipoOperacionUSD) {
      const monto = parseFloat((this.reciboUSD || '0').replace(/,/g, ''));
      this.entregoUSD = monto > 0 ? this.obtenerMontoEntregado(monto, 'USD') : '00.00';
    }
    if (this.mostrarEntregoEUR && this.reciboEUR && this.tipoOperacionEUR) {
      const monto = parseFloat((this.reciboEUR || '0').replace(/,/g, ''));
      this.entregoEUR = monto > 0 ? this.obtenerMontoEntregado(monto, 'EUR') : '00.00';
    }
  }

  ajustarValor(valor: number, delta: number): number {
    const cambio = (Math.random() - 0.5) * 2 * delta;
    let nuevo = valor + cambio;
    if (nuevo < 1) nuevo = 1 + Math.random() * 0.1;
    return Number(nuevo.toFixed(4));
  }

  obtenerFechaActual(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  obtenerParesDivisas(): void {
    this.http.get<ParDivisa[]>('http://localhost:8080/compraventa/catalogos/obtenerParDivisas/4')
      .subscribe(data => {
        this.pares = data;
        this.paresDivisas = data;

        const parUSD = this.pares.find(p => p.descripcion === 'USD/MXN');
        const parEUR = this.pares.find(p => p.descripcion === 'EUR/MXN');

        if (parUSD) this.obtenerFechasLiquidacion(parUSD.id, 'USD');
        if (parEUR) this.obtenerFechasLiquidacion(parEUR.id, 'EUR');
      });
  }

  obtenerFechasLiquidacion(idDivisa: number, tipo: Divisa): void {
    this.http.get<FechaLiquidacion[]>(`http://localhost:8080/compraventa/catalogos/obtenerFechasLiquidacion/${idDivisa}`)
      .subscribe(fechas => {
        if (tipo === 'USD') this.fechasUSD = fechas;
        if (tipo === 'EUR') this.fechasEUR = fechas;
      });
  }

  seleccionarOperacion(operacion: string, divisa: Divisa): void {
    if (divisa === 'USD') {
      const mismaSeleccion = this.tipoOperacionUSD === operacion;
      this.tipoOperacionUSD = mismaSeleccion ? null : operacion;
      this.mostrarEntregoUSD = false;
      this.reciboUSD = '';
      this.entregoUSD = '';
      this.mostrarConfirmacionUSD = false;
      this.errorMontoUSD = false;
    }
    if (divisa === 'EUR') {
      const mismaSeleccion = this.tipoOperacionEUR === operacion;
      this.tipoOperacionEUR = mismaSeleccion ? null : operacion;
      this.mostrarEntregoEUR = false;
      this.reciboEUR = '';
      this.entregoEUR = '';
      this.mostrarConfirmacionEUR = false;
      this.errorMontoEUR = false;
    }
  }

  esInputGris(divisa: Divisa, campo: string): boolean {
    if (campo !== 'entrego') return false;
    if (divisa === 'USD') return this.tipoOperacionUSD === 'compra';
    if (divisa === 'EUR') return this.tipoOperacionEUR === 'compra';
    return false;
  }

  formatearInput(valor: string): string {
    const limpio = valor.replace(/[^\d.]/g, '');
    const partes = limpio.split('.');
    const enteros = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let decimales = partes[1] || '';
    if (decimales.length > 2) decimales = decimales.substring(0, 2);
    while (decimales.length < 2) decimales += '0';
    return `${enteros}.${decimales}`;
  }

  formatearDecimales(divisa: Divisa): void {
    if (divisa === 'USD' && this.reciboUSD) {
      this.reciboUSD = this.formatearInput(this.reciboUSD);
    }
    if (divisa === 'EUR' && this.reciboEUR) {
      this.reciboEUR = this.formatearInput(this.reciboEUR);
    }
  }

  actualizarRecibo(divisa: Divisa, event: any): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const partes = raw.split('.');
    if (partes.length > 2) return;

    if (divisa === 'USD') {
      this.reciboUSD = raw;
      this.entregoUSD = '';
      this.mostrarEntregoUSD = false;
      this.errorMontoUSD = false;
    }
    if (divisa === 'EUR') {
      this.reciboEUR = raw;
      this.entregoEUR = '';
      this.mostrarEntregoEUR = false;
      this.errorMontoEUR = false;
    }
  }

  blurInput(divisa: Divisa): void {
    this.formatearDecimales(divisa);
    this.inputFocus[divisa] = false;
  }

  limpiarInput(event: any, divisa: Divisa): void {
    event.target.value = '';
    if (divisa === 'USD') {
      this.reciboUSD = '';
      this.entregoUSD = '';
      this.mostrarEntregoUSD = false;
      this.errorMontoUSD = false;
    }
    if (divisa === 'EUR') {
      this.reciboEUR = '';
      this.entregoEUR = '';
      this.mostrarEntregoEUR = false;
      this.errorMontoEUR = false;
    }
  }

  activarFocus(divisa: Divisa): void {
    this.inputFocus[divisa] = true;
  }

  activarFocusSelect(divisa: Divisa): void {
    this.selectFocus[divisa] = true;
  }

  desactivarFocusSelect(divisa: Divisa): void {
    this.selectFocus[divisa] = false;
  }

  obtenerMontoEntregado(monto: number, divisa: Divisa): string {
    let resultado = 0;
    if (divisa === 'USD') {
      if (this.tipoOperacionUSD === 'compra') {
        resultado = monto * this.tasaCompraUSD;
      } else if (this.tipoOperacionUSD === 'venta') {
        resultado = monto * this.tasaVentaUSD;
      }
    }
    if (divisa === 'EUR') {
      if (this.tipoOperacionEUR === 'compra') {
        resultado = monto * this.tasaCompraEUR;
      } else if (this.tipoOperacionEUR === 'venta') {
        resultado = monto * this.tasaVentaEUR;
      }
    }
    return resultado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parDeshabilitado(par: string): boolean {
    const seleccionados = ['USD/MXN', 'EUR/MXN'];
    return seleccionados.includes(par);
  }

  estaHabilitado(par: string): boolean {
    return par === 'USD/MXN' || par === 'EUR/MXN';
  }

  validarInputNumerico(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const key = event.key;
    const value = input.value;
    if (!/[\d.]/.test(key)) event.preventDefault();
    if (key === '.' && value.includes('.')) event.preventDefault();
    const cursorPos = input.selectionStart || 0;
    const partes = value.split('.');
    if (partes[1]?.length >= 2 && cursorPos > value.indexOf('.')) {
      event.preventDefault();
    }
  }

  catalogoHabilitado(divisa: Divisa): boolean {
    if (divisa === 'USD') return this.tipoOperacionUSD !== null;
    if (divisa === 'EUR') return this.tipoOperacionEUR !== null;
    return false;
  }

  cotizar(divisa: Divisa): void {
    if (divisa === 'USD') {
      const monto = parseFloat((this.reciboUSD || '0').replace(/,/g, ''));
      if (monto > this.LIMITE_MAXIMO) {
        this.errorMontoUSD = true;
        return;
      }
      this.errorMontoUSD = false;
      this.entregoUSD = monto > 0 ? this.obtenerMontoEntregado(monto, 'USD') : '00.00';
      this.mostrarConfirmacionUSD = true;
      this.mostrarEntregoUSD = true;
    }
    if (divisa === 'EUR') {
      const monto = parseFloat((this.reciboEUR || '0').replace(/,/g, ''));
      if (monto > this.LIMITE_MAXIMO) {
        this.errorMontoEUR = true;
        return;
      }
      this.errorMontoEUR = false;
      this.entregoEUR = monto > 0 ? this.obtenerMontoEntregado(monto, 'EUR') : '00.00';
      this.mostrarConfirmacionEUR = true;
      this.mostrarEntregoEUR = true;
    }
  }

  rechazarCotizacion(divisa: Divisa): void {
    if (divisa === 'USD') {
      this.reciboUSD = '';
      this.entregoUSD = '';
      this.tipoOperacionUSD = null;
      this.mostrarConfirmacionUSD = false;
      this.mostrarEntregoUSD = false;
      this.errorMontoUSD = false;
    }
    if (divisa === 'EUR') {
      this.reciboEUR = '';
      this.entregoEUR = '';
      this.tipoOperacionEUR = null;
      this.mostrarConfirmacionEUR = false;
      this.mostrarEntregoEUR = false;
      this.errorMontoEUR = false;
    }
  }

  rechazar(divisa: Divisa): void {
    this.rechazarCotizacion(divisa);
  }
}
