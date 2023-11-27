import { inject, Injectable } from '@angular/core'
import { ToastController } from '@ionic/angular'

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  toastController = inject(ToastController)
  #errorMessages: string[] = []

  constructor() {
  }

  /**
   * Add a new error message to the message queue, it will be shown when all previous messages have either been
   * dismissed by the user or have been hidden automatically.
   *
   * @param message The error message to show to the user.
   */
  enqueueErrorMessage(message: string): void {
    this.#errorMessages.push(message)

    if (this.#errorMessages.length === 1) {
      this.#showErrorMessage().then()
    }
  }

  async #showErrorMessage(): Promise<void> {
    if (this.#errorMessages.length === 0) {
      return
    }

    const toast = await this.toastController.create({
      message: this.#errorMessages[0],
      duration: 1500,
      position: 'top',
    })

    toast.onDidDismiss().then(() => {
      this.#errorMessages = this.#errorMessages.slice(1)
      this.#showErrorMessage()
    })

    await toast.present()
  }
}