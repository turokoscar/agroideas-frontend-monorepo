import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UiToastContainerComponent } from '@agroideas/ui';

@Component({
  standalone: true,
  imports: [RouterModule, UiToastContainerComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'sigec-rtf';
}
