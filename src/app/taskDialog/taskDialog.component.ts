import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-taskDialog',
  templateUrl: './taskDialog.component.html',
  styleUrls: ['./taskDialog.component.scss']
})
export class TaskDialogComponent implements OnInit {


  constructor(
    public dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
  }

  cancel(): void {
    this.dialogRef.close();
  }

}