import { Injectable, inject } from '@angular/core';
import { Photo, PermissionStatus, Camera, CameraSource, CameraResultType } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ErrorService } from './error.service';
import { Filesystem, Directory } from '@Capacitor/filesystem'


@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  readonly photos: Photo[] = []
  readonly #storageKey = 'photos'
  #errorService = inject(ErrorService)

  #photoURIs: string[] = []
  #permissionsGranted: PermissionStatus = { camera: 'prompt', photos: 'prompt' }

  constructor() {
    this.#loadData().then(() => console.log('Data loaded'))
  }

  async takePhoto(): Promise<void> {
    // Does user have ALL permissions? If not -> Prompt again.
    if (!this.#haveCameraPermission || !this.#havePhotoPermission()) {
      await this.#requestPermissions()
    }

    // Check again if user has permissions. If not, send error message
    if (!this.#haveCameraPermission || !this.#havePhotoPermission()) {
      this.#errorService.enqueueErrorMessage('Cannot take picture because the right to do so has not been granted')
      return
    }

    // Take picture
    const image = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Base64,
      source: this.#determinePhotoSource(),
    })

    // Store Image URI
    const uri = await this.#saveImageToFileSystem(image)
    this.#photoURIs.push(uri)
    image.path = uri
    this.#persistPhotoURIS().then(() => console.log('Persist completed'))

    // Add photo to local memory storage
    image.dataUrl = `data:image/${image.format};base64, ${image.base64String}`
    this.photos.push(image)
  }

  async #saveImageToFileSystem(photo: Photo): Promise<string> {
    if (!photo.base64String) {
      throw new Error('No photo data available')
    }

    const fileName = `${new Date().getTime()}.${photo.format}`
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: photo.base64String,
      directory: Directory.Data,
    })

    return savedFile.uri
  }

  async #loadData() {
    await this.#retrievePhotoURIs()
    await this.#retrievePermissions()
    await this.#loadPhotos()
  }

  async #loadPhotos(): Promise<void> {
    for (const uri in this.#photoURIs) {

      const data = await Filesystem.readFile({ path: uri })

      const format = this.#getPhotoFormat(uri)

      this.photos.push({
        dataUrl: `data:image/${format};base64,${data.data}`,
        format,
        path: uri,
        saved: false,
      })
    }
  }

  #getPhotoFormat(uri: string): string {
    // Get string after last . [png, jpg, bmp]
    const splitURI = uri.split('.')
    return splitURI[splitURI.length - 1]
  }

  async #retrievePermissions(): Promise<void> {
    try {
      this.#permissionsGranted = await Camera.checkPermissions()
    }
    catch {
      console.error(`Permission are not enabled on this device: ${Capacitor.getPlatform} platform`)
    }
  }

  async #requestPermissions(): Promise<void> {
    try {
      this.#permissionsGranted =
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
    }
    catch {
      console.error(`Permission are not enabled on this device: ${Capacitor.getPlatform} platform`)
    }
  }

  async #retrievePhotoURIs(): Promise<void> {
    const { value } = await Preferences.get({ key: this.#storageKey })
    this.#photoURIs = value ? JSON.parse(value) : []
  }

  async #persistPhotoURIS(): Promise<void> {
    await Preferences.set({
      key: this.#storageKey,
      value: JSON.stringify(this.#photoURIs)
    })
  }

  #haveCameraPermission(): boolean {
    return this.#permissionsGranted.camera === 'granted'
  }

  #havePhotoPermission(): boolean {
    return this.#permissionsGranted.photos === 'granted'
  }

  #determinePhotoSource(): CameraSource {
    if (!Capacitor.isNativePlatform()) {
      // Web debugging
      return CameraSource.Camera
    }

    if (this.#haveCameraPermission() && this.#havePhotoPermission()) {
      return CameraSource.Prompt
    }
    else {
      return this.#havePhotoPermission()
        ? CameraSource.Photos
        : CameraSource.Camera
    }
  }
}
