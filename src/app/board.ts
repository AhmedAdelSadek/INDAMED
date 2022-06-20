import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import exportFromJSON from 'export-from-json';
import * as _ from 'lodash';
import { Subject, takeUntil } from 'rxjs';
import { TaskDialogComponent } from './taskDialog/taskDialog.component';
import team1 from '../assets/team1.json';

@Component({
  selector: 'board',
  templateUrl: 'board.html',
  styleUrls: ['board.css'],
})
export class KanbanBoard {
  board: Board
  firstTeam: any[] = []
  secondTeam: any[] = []
  columnIndex: any[] = ['2', '3', '4', '5', '6', '7', '8', '9']
  teamToggel: FormControl = new FormControl(true);
  availableSearchInput: FormControl = new FormControl('');
  team: FormControl = new FormControl('First Team');
  TeamArr: any[] = ['First Team', 'Second Team']
  affectedArr: any[] = ['Alle']
  updateColumns: any[] = []
  selectedOption = ['2', '3', '4', '5', '6', '7', '8', '9'];
  nameList: any[] = [
    { value: '1', viewValue: 'Backlog' },
    { value: '2', viewValue: 'Im Sprint' },
    { value: '3', viewValue: 'In Entwicklung' },
    { value: '4', viewValue: 'Zu Testen' },
    { value: '5', viewValue: 'Im Test' },
    { value: '6', viewValue: 'Done' },
    { value: '7', viewValue: 'Dokumentation' },
    { value: '8', viewValue: 'Done Done' },
    { value: '9', viewValue: 'Wartend' },
    { value: '10', viewValue: 'Neue Info' }
  ];
  form: FormGroup = new FormGroup({});
  firstTeamUmgesetztResult: any[] = []
  firstTeamGeplantResult: any
  secondTeamUmgesetztResult: any[] = []
  secondTeamGeplantResult: any
  returnFromSearch: any[] = []
  dataCloneFirstTeam: any
  dataCloneSecondTeam: any
  keys: any[] = []
  _unsubscribeAll: Subject<any>;
  limit: any = 2
  counter: any = 0
  globalData: any = team1;
  counterControl: FormControl = new FormControl();
  /**
   * Creates an instance of Board.
   * @param httpClient 
   * @param fb 
   * @param dialog 
   */
  constructor(private httpClient: HttpClient, fb: FormBuilder, private dialog: MatDialog) {
    this.form = fb.group({
      name: [this.selectedOption]
    })
    this._unsubscribeAll = new Subject();
  }
  /**
   * on init
   */
  ngOnInit() {
    // first team => default team
    this.httpClient.get("assets/team1.json").pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe(data => {
        console.log(data)// => can not access data object
        // to access properties of Object
        let jsonFile = JSON.stringify(data) // convert the object to a JSON object. 
        let object = JSON.parse(jsonFile) // convert the JSON object to an object.
        console.log(object)
        // rename object properties
        let renamedObject = this.renameObject(object)
        // get object keys
        this.keys = Object.keys(renamedObject)
        // get object values
        this.firstTeam = Object.values(renamedObject)
        // create initial Board
        this.createBoard(this.firstTeam) // return => this.board.columns
        // I want an original object, for using it in the search function.
        // clone => creating a new object with the same properties as the original object, because I want the original object every-time, when implementing the search function. 
        this.dataCloneFirstTeam = _.clone(this.board.columns)
        // account Umgesetzt and Geplant firstTeam
        this.getGplantUmgesetzt(this.firstTeam, true)
      })
    // Toggel
    this.teamToggel.valueChanges.subscribe(value => {
      if (!value) {
        // Second team
        this.httpClient.get("assets/team2.json").pipe(
          takeUntil(this._unsubscribeAll))
          .subscribe(data => {
            let jsonFile = JSON.stringify(data)
            let object = JSON.parse(jsonFile)
            let renamedObject = this.renameObject(object)
            this.secondTeam = Object.values(renamedObject)
            this.createBoard(this.secondTeam) // return => this.board.columns
            this.dataCloneSecondTeam = _.clone(this.board.columns)
            // account Umgesetzt and Geplant firstTeam
            this.getGplantUmgesetzt(this.secondTeam, false);
            this.resetMultiSelectButton();
          })
      } else {
        // // first team
        this.createBoard(this.firstTeam)
        // reset checks => setting button
        this.resetMultiSelectButton();
      }
    })
    // searsh input
    this.availableSearchInput.valueChanges.subscribe(v => {
      if (this.teamToggel.value) {
        if (v) {
          this.returnFromSearch = this.search(this.dataCloneFirstTeam, v)
          // create new board from the search Result 
          this.createBoard(this.returnFromSearch)
          this.resetMultiSelectButton()
        } else {
          this.createBoard(this.firstTeam)
          this.resetMultiSelectButton()
        }
      } else {
        if (v) {
          this.returnFromSearch = this.search(this.dataCloneSecondTeam, v)
          // create new board from the search Result 
          this.createBoard(this.returnFromSearch)
          this.resetMultiSelectButton()
        } else {
          this.createBoard(this.secondTeam)
          this.resetMultiSelectButton()
        }
      }
    })
    console.log(this.globalData.backlog)
    // get limited number of elements when I want 
    this.counterControl.valueChanges.subscribe(counter => {
      this.limit = this.limit ?? Object.values(this.globalData).flat().length;
      let res = Object.values(this.globalData).flat().splice(0, counter > 0 ? this.limit += 2 : this.limit);
      console.log(res)
    })
  }
  /**
   * Gets gplant umgesetzt
   * @param array 
   * @param toggle 
   */
  getGplantUmgesetzt(array: any[], toggle: any) {
    if (toggle) {
      // Umgesetzt 
      this.firstTeamUmgesetztResult = array.flat().filter(v => {
        return v.status_e == "Umgesetzt" || v.status_e == "Doku"
      })
      // Geplant 

      this.firstTeamGeplantResult = array.flat().filter(v => {
        return v.points != "" && v.points != undefined
      }).map(v => +v.points).reduce((total, num) => {
        return total + num;
      })
    } else {
      // Umgesetzt 
      this.secondTeamUmgesetztResult = array.flat().filter(v => {
        return v.status_e == "Umgesetzt" || v.status_e == "Doku"
      })
      // Geplant 
      this.secondTeamGeplantResult = array.flat().filter(v => {
        return v.points != "" && v.points != undefined
      }).map(v => +v.points).reduce((total, num) => {
        return total + num;
      })
    }
  }
  /**
   * Resets multi select button
   */
  resetMultiSelectButton() {
    this.form.get('name')?.setValue(this.selectedOption)
  }
  /**
   * Searchs
   * @param boardColumns 
   * @param filterText 
   * @returns search 
   */
  search(boardColumns: any[], filterText: any): Column[] {
    return boardColumns.map((everyColumn: any) => {
      return everyColumn.tasks.filter((item: any) => {
        return item?.mo_number?.toLowerCase().includes(filterText.toLowerCase()) ||
          item?.subject?.toLowerCase().includes(filterText.toLowerCase()) ||
          item?.affected?.toLowerCase().includes(filterText.toLowerCase())
      })
    });
  }
  /**
    * Renames object
    * @param object 
    * @returns  
    */
  renameObject(object: any) {
    // Assign new key
    object['Im Sprint'] = object['open'];
    object['In Entwicklung'] = object['in_progress'];
    object['Zu Testen'] = object['to_test'];
    object['Im Test'] = object['in_test'];
    object['Done'] = object['done'];
    object['Dokumentation'] = object['documentation'];
    object['Done Done'] = []
    object['Wartend'] = object['waiting'];
    object['Backlog'] = object['backlog'];
    object['Neue Info'] = object['new_info'];
    object['Users'] = object['users'];
    // Delete old key
    delete object['open'];
    delete object['to_test'];
    delete object['in_test'];
    delete object['waiting'];
    delete object['documentation'];
    delete object['new_info'];
    delete object['done'];
    delete object['in_progress'];
    delete object['backlog'];
    delete object['users'];

    return object;
  }
  /**
   * Creates team
   * @param team 
   */
  createBoard(team: any[]) {
    this.board = new Board([
      // new Column(this.keys[8], '1', team[8]),
      new Column(this.keys[0], '2', team[0]),
      new Column(this.keys[1], '3', team[1]),
      new Column(this.keys[2], '4', team[2]),
      new Column(this.keys[3], '5', team[3]),
      new Column(this.keys[4], '6', team[4]),
      new Column(this.keys[5], '7', team[5]),
      new Column(this.keys[6], '8', team[6]),
      new Column(this.keys[7], '9', team[7]),
      // new Column(this.keys[9], '10', team[9]),
    ]);
  }
  /**
  * Updates team
  * @param team 
  * @param changes 
  */
  updateBoard(team: any[], changes: any[]) {
    this.updateColumns = []
    changes.map(c => {
      if (c == '1') this.updateColumns.push(new Column(this.keys[8], '1', team[8]))
      if (c == '2') this.updateColumns.push(new Column(this.keys[0], '2', team[0]))
      if (c == '3') this.updateColumns.push(new Column(this.keys[1], '3', team[1]))
      if (c == '4') this.updateColumns.push(new Column(this.keys[2], '4', team[2]))
      if (c == '5') this.updateColumns.push(new Column(this.keys[3], '5', team[3]))
      if (c == '6') this.updateColumns.push(new Column(this.keys[4], '6', team[4]))
      if (c == '7') this.updateColumns.push(new Column(this.keys[5], '7', team[5]))
      if (c == '8') this.updateColumns.push(new Column(this.keys[6], '8', team[6]))
      if (c == '9') this.updateColumns.push(new Column(this.keys[7], '9', team[7]))
      if (c == '10') this.updateColumns.push(new Column(this.keys[9], '10', team[9]))
    })
    this.board = new Board(this.updateColumns)
    this.columnIndex = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  }
  /**
   * Filters by team
   * @param change 
   */
  filterByTeam(change: MatSelectChange) {
    change.value == "First Team" ? this.teamToggel.setValue(true) : this.teamToggel.setValue(false);
    this.team.setValue(change.value)
  }
  /**
   * Filters by affected
   * @param change 
   */
  filterByAffected(change: MatSelectChange) {
    // console.log(change)
  }
  /**
   * Filters by checked
   * @param change 
   */
  filterByChecked(change: MatSelectChange) {
    this.teamToggel.value ? this.updateBoard(this.firstTeam, change.value) : this.updateBoard(this.secondTeam, change.value);
    this.counterControl.setValue(this.counter++)
    this.counter++
  }
  /**
   * Reloads current page
   */
  reloadCurrentPage() {
    window.location.reload();
  }
  /**
   * News task
   */
  newTickt(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.board.columns[0].tasks.unshift({
            affected: result.task.affected,
            mo_number: result.task.mo_number,
            subject: result.task.subject,
          })
        }
      });
  }
  /**
  * Export file as JSON
  */
  onClick() {
    const data = this.board
    const fileName = 'download'
    const exportType = 'json'
    exportFromJSON({ data, fileName, exportType })
  }
  /**
   * Drops tickets
   * @param event 
   */
  drop(event: CdkDragDrop<string[]>): void {
    // console.log('previous colum id', event.previousContainer.id)
    // console.log('previous colum data', event.previousContainer.data)
    // console.log('current colum id', event.container.id)
    // console.log('current colum data', event.container.data)
    if(event.previousContainer === event.container) {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  } else {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
/**
 * on destroy
 */
ngOnDestroy(): void {
  this._unsubscribeAll.next(null);
  this._unsubscribeAll.complete();
}
}

class Board {
  constructor(public columns: Column[]) { }
}

class Column {
  constructor(public name: string, public id: string, public tasks: any[]) { }
}



