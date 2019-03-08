<template>
  <b-container>
    <b-row>
      <b-col>
        <h1>Patient region matcher</h1>
        <label>Chromosome 6</label>
        <vue-slider v-model="value" :order="true" :min="0" :max="171115067"></vue-slider>
        <b-row>
          <b-col cols="6">
            <b-form-group label-cols="4" label="Start position">
              <b-form-input v-model="start" type="number" :state="stop ? start > stop ? false : null : null"
                            placeholder="Start position" aria-describedby="invalidFeedbackStart"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackStart">
                Start cannot be bigger than stop
              </b-form-invalid-feedback>
            </b-form-group>
            <b-form-group label-cols="4" label="Stop position">
              <b-form-input v-model="stop" type="number" :state="stop ? stop <= 171115067 ? null : false : null"
                            placeholder="Stop position" aria-describedby="invalidFeedbackStop"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackStop">
                Stop cannot be bigger than length of chromosome 6 in hg19 (171115067 bp)
              </b-form-invalid-feedback>
            </b-form-group>
          </b-col>
          <b-col cols="6">
            <b-form-group label-cols="4" label="Overlap percentage">
              <b-form-input v-model="overlap" type="number" :state="overlap ? overlap <= 100 ? null : false: null"
                            placeholder="Overlap"
                            aria-describedby="invalidFeedbackOverlap"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackOverlap">
                Max overlap is 100%
              </b-form-invalid-feedback>
            </b-form-group>
            <b-form-group label="Type of abberration">
              <b-form-radio-group
                v-model="aberration_type"
                name="aberration"
              >
                <b-form-radio value="deletion" :selected="true">Deletion</b-form-radio>
                <b-form-radio value="duplication">Duplication</b-form-radio>
              </b-form-radio-group>
            </b-form-group>
          </b-col>
        </b-row>
        <b-row>
          <b-col>
            <b-button variant="primary" @click="getMatchingArrayData">Get matching patients</b-button>
            {{this.status}}
          </b-col>
        </b-row>
      </b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-table :fields="['symptom', 'count']" :items="table"></b-table>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/default.css'
import { mapActions } from 'vuex'

export default {
  name: 'PatientRegionMatcher',
  components: {
    VueSlider
  },
  methods: {
    ...mapActions(['getArrayData', 'getPatients', 'getPhenotypeOptions']),
    getMatchingArrayData: function () {
      this.status = 'Loading...'
      this.matchingArrays = []
      const filteredData = this.$store.state.array.filter((aberration) => {
        const startPos = aberration.Start_positie_in_Hg19
        const stopPos = aberration.Stop_positie_in_Hg19
        const imbalance = aberration.imbalance ? aberration.imbalance.id === 'x1' || aberration.imbalance.id === 'x0' ? 'deletion' : 'duplication' : null
        return startPos && stopPos && imbalance ? this.isWithinRegion(startPos, stopPos) && this.isMatchingAberration(imbalance) && this.isWithinOverlap(startPos, stopPos): false
      })
      this.matchingArrays = filteredData.map((patient) => {
        return [
          patient.owner,
          patient.Start_positie_in_Hg19,
          patient.Stop_positie_in_Hg19,
          patient.imbalance.id]
      })
      let matchingPatients = this.matchingArrays.map((patient) => { return patient[0] })
      matchingPatients = [...new Set(matchingPatients)]
      this.matchingPatientPhenotypes = this.$store.state.patients.filter((patient) => {
        return matchingPatients.indexOf(patient.label) > -1
      })
      this.$store.state.phenotypes.forEach((symptom) => {
        this.symptomCounter[symptom.value] = 0
        this.symptomMap[symptom.value] = symptom.text
        this.matchingPatientPhenotypes.forEach((patient) => {
          if (patient[symptom.value].id === 'T') {
            this.symptomCounter[symptom.value] += 1
          }
        })
      })
      this.relevantSymptoms = Object.keys(this.symptomCounter).filter(
        (key) => { return this.symptomCounter[key] > 1 }).sort((a, b) => { return this.symptomCounter[b] - this.symptomCounter[a] })
      this.table = this.relevantSymptoms.map(
        (symptom) => { return { symptom: this.symptomMap[symptom], count:this.symptomCounter[symptom] } })
      this.status = 'Done'
    },
    isMatchingAberration: function (type) {
      return type === this.aberration_type
    },
    isWithinRegion: function (start, stop) {
      return start < this.stop && stop > this.start
    },
    isWithinOverlap: function (start, stop) {
      if (this.bpOverlap) {
        if (this.start >= start && this.stop <= stop) {
          return true
        } else if (start >= this.start && stop <= this.stop) {
          return stop - start > this.bpOverlap
        } else if (start >= this.start) {
          return this.stop - start > this.bpOverlap
        } else if (stop <= this.stop) {
          return stop - this.start > this.bpOverlap
        } else {
          return false
        }
      } else {
        return true
      }
    }
  },
  data () {
    return {
      start: 0,
      stop: 171115067,
      overlap: null,
      aberration_type: 'deletion',
      matchingArrays: [],
      matchingPatientPhenotypes: [],
      status: '',
      relevantSymptoms: [],
      table: [],
      symptomMap: {},
      symptomCounter: {}
    }
  },
  computed: {
    bpOverlap: function () {
      const length = this.stop - this.start
      return this.overlap ? Math.round(length * parseInt(this.overlap) / 100) : 0
    },
    value: {
      get: function () {
        return this.start && this.stop ? [this.start, this.stop] : [0, 171115067]
      },
      set: function (newValue) {
        this.start = newValue[0]
        this.stop = newValue[1]
      }
    }
  },
  mounted () {
    this.getArrayData()
    this.getPatients()
    this.getPhenotypeOptions()
  }
}
</script>
