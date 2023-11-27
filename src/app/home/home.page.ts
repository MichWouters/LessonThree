import { Component, inject } from '@angular/core';
import { PhotoService } from 'src/services/photo.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  photoService = inject(PhotoService)

  constructor() { }

}
