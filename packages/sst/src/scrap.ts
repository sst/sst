class vehicle {
  #wheels: number;
  #seats: number;

  get wheels() {
    return this.#wheels;
  }

  get seats() {
    return this.#seats;
  }

  constructor(wheels: number, seats: number) {
    this.#wheels = wheels;
    this.#seats = seats;
  }
}

class driftable {
  #swervefactor: number;

  get swervefactor() {
    return this.#swervefactor;
  }

  constructor(swervefactor: number) {
    this.#swervefactor = swervefactor;
  }
}

class car extends vehicle {
  constructor() {
    super(4, 5);
  }
}

const mycar = new car();
mycar.seats;
mycar.wheels;

function createvehicle(wheels: number, seats: number) {
  return {
    get wheels() {
      return wheels;
    },
    get seats() {
      return seats;
    },
  };
}

function createdriftable(swervefactor: number) {
  return {
    get swervefactor() {
      return swervefactor;
    },
  };
}

function createcar() {
  const vehicle = createvehicle(4, 4);
  const driftable = createdriftable(0.5);

  return {
    ...vehicle,
    ...driftable,
  };
}

const functionalcar = createcar();
