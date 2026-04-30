const encoder = new TextEncoder()

export type PrinterPresetId = 'generic-ffe0' | 'nordic-uart'

export interface PrinterPreset {
  id: PrinterPresetId
  name: string
  serviceUuid: BluetoothServiceUUID
  characteristicUuid: BluetoothCharacteristicUUID
  description: string
}

type BluetoothServiceUUID = string
type BluetoothCharacteristicUUID = string

type BluetoothRequestDeviceOptions = {
  acceptAllDevices?: boolean
  optionalServices?: BluetoothServiceUUID[]
}

type BluetoothDevice = {
  name?: string
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServer>
  }
}

type BluetoothRemoteGATTServer = {
  getPrimaryService: (service: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService>
}

type BluetoothRemoteGATTService = {
  getCharacteristic: (characteristic: BluetoothCharacteristicUUID) => Promise<BluetoothRemoteGATTCharacteristic>
}

type BluetoothRemoteGATTCharacteristic = {
  writeValue: (value: Uint8Array) => Promise<void>
}

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: BluetoothRequestDeviceOptions) => Promise<BluetoothDevice>
  }
}

export const printerPresets: PrinterPreset[] = [
  {
    id: 'generic-ffe0',
    name: 'BLE generica FFE0/FFE1',
    serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
    description: 'Comum em impressoras termicas BLE ESC/POS de 58mm.',
  },
  {
    id: 'nordic-uart',
    name: 'Nordic UART',
    serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    characteristicUuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    description: 'Usado por alguns adaptadores BLE compatíveis com UART.',
  },
]

export function isBluetoothPrintSupported() {
  return Boolean((navigator as BluetoothNavigator).bluetooth?.requestDevice)
}

export async function printEscPosTestPage(preset: PrinterPreset) {
  const bluetooth = (navigator as BluetoothNavigator).bluetooth

  if (!bluetooth) {
    throw new Error('Este navegador nao oferece suporte a Bluetooth direto pelo PWA.')
  }

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [preset.serviceUuid],
  })

  if (!device.gatt) {
    throw new Error('A impressora selecionada nao disponibilizou conexao Bluetooth GATT.')
  }

  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(preset.serviceUuid)
  const characteristic = await service.getCharacteristic(preset.characteristicUuid)
  const payload = buildTestPage(device.name ?? 'Impressora Bluetooth')

  for (const chunk of chunkBytes(payload, 180)) {
    await characteristic.writeValue(chunk)
  }

  return device.name ?? 'Impressora Bluetooth'
}

function buildTestPage(printerName: string) {
  return concatBytes(
    Uint8Array.from([0x1b, 0x40]),
    encoder.encode('PREFEITURA MUNICIPAL\n'),
    encoder.encode('Teste de impressao\n'),
    encoder.encode('------------------------------\n'),
    encoder.encode(`Dispositivo: ${printerName}\n`),
    encoder.encode(`Data: ${new Date().toLocaleString('pt-BR')}\n`),
    encoder.encode('Sistema de Vistorias e Chamados\n'),
    encoder.encode('Impressao Bluetooth via PWA.\n\n\n'),
    Uint8Array.from([0x1d, 0x56, 0x42, 0x00]),
  )
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

function chunkBytes(bytes: Uint8Array, size: number) {
  const chunks: Uint8Array[] = []

  for (let index = 0; index < bytes.length; index += size) {
    chunks.push(bytes.slice(index, index + size))
  }

  return chunks
}
