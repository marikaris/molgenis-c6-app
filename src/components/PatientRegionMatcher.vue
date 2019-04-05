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
                            placeholder="Start position" aria-describedby="invalidFeedbackStart"
                            @change="clearTable"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackStart">
                Start cannot be bigger than stop
              </b-form-invalid-feedback>
            </b-form-group>
            <b-form-group label-cols="4" label="Stop position">
              <b-form-input v-model="stop" type="number" :state="stop ? stop <= 171115067 ? null : false : null"
                            placeholder="Stop position" aria-describedby="invalidFeedbackStop"
                            @change="clearTable"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackStop">
                Stop cannot be bigger than length of chromosome 6 in hg19 (171115067 bp)
              </b-form-invalid-feedback>
            </b-form-group>
          </b-col>
          <b-col cols="6">
            <b-form-group label-cols="4" label="Overlap percentage">
              <b-form-input v-model="overlap" type="number" :state="overlap ? overlap <= 100 ? null : false: null"
                            placeholder="Overlap"
                            aria-describedby="invalidFeedbackOverlap"
                            @change="clearTable"></b-form-input>
              <b-form-invalid-feedback id="invalidFeedbackOverlap">
                Max overlap is 100%
              </b-form-invalid-feedback>
            </b-form-group>
            <b-form-group label="Type of aberration">
              <b-form-radio-group
                v-model="aberration_type"
                name="aberration">
                <b-form-radio value="deletion" :selected="true">Deletion</b-form-radio>
                <b-form-radio value="duplication">Duplication</b-form-radio>
              </b-form-radio-group>
            </b-form-group>
          </b-col>
        </b-row>
        <b-row>
          <b-col>
            <b-button variant="primary" @click="getMatchingArrayData" :disabled="!this.readyToStart">
              <span v-if="!this.readyToStart"><font-awesome-icon icon="spinner" spin></font-awesome-icon> Loading array and phenotype data</span>
              <span v-else>Get matching patients <font-awesome-icon icon="notes-medical"></font-awesome-icon></span>
            </b-button>
          </b-col>
        </b-row>
        <separator></separator>
        <b-row>
          <b-col>
            <search-results-summary :start="start" :stop="stop" :type="aberration_type" :view="table_loaded"
                                    :overlap="overlap" :total="total"></search-results-summary>
          </b-col>
        </b-row>
        <separator></separator>
      </b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-button v-if="table_loaded" class="float-right" @click="createCsvFromTable">
          Download <font-awesome-icon icon="file-download"></font-awesome-icon>
        </b-button>
      </b-col>
    </b-row>
    <separator></separator>
    <b-row>
      <b-col>
        <b-table v-if="table_loaded" :fields="['feature', 'count', 'percentage']" :items="table"></b-table>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import VueSlider from 'vue-slider-component'
import SearchResultsSummary from './SearchResultsSummary'
import Separator from './Separator'
import 'vue-slider-component/theme/default.css'
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'PatientRegionMatcher',
  components: {
    VueSlider,
    SearchResultsSummary,
    Separator
  },
  methods: {
    ...mapActions(['getArrayData', 'getPatients', 'getPhenotypeOptions']),
    generateFileName () {
      const date = new Date()
      const dateInfo = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`
      return `export_${dateInfo}_chr6:${this.start}-${this.stop}_${this.aberration_type}.csv`
    },
    getPercentage (number, total) {
      const percentage = number / total * 100
      return percentage.toFixed(0) + '%'
    },
    createCsvFromTable () {
      let csvContent = '"Feature","Count","Percentage"\n'
      this.table.forEach((row) => {
        csvContent += `"${row['feature']}","${row['count']}","${row['percentage']}"\n`
      })
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const filename = this.generateFileName()
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename)
      } else {
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    },
    filterArrayData (arrayData) {
      return arrayData.filter((aberration) => {
        const startPos = aberration.Start_positie_in_Hg19
        const stopPos = aberration.Stop_positie_in_Hg19
        const imbalance = aberration.imbalance ? aberration.imbalance.id === 'x1' || aberration.imbalance.id === 'x0'
          ? 'deletion'
          : 'duplication' : null
        return startPos && stopPos && imbalance ? this.isWithinRegion(startPos, stopPos) &&
            this.isMatchingAberration(imbalance) && this.isWithinOverlap(startPos, stopPos) : false
      })
    },
    reformatArrayData (arrayData) {
      return arrayData.map((patient) => {
        return [
          patient.owner,
          patient.Start_positie_in_Hg19,
          patient.Stop_positie_in_Hg19,
          patient.imbalance.id]
      })
    },
    getUniqueMatchingPatientIds (matchingArrays) {
      let matchingPatients = matchingArrays.map((patient) => { return patient[0] })
      matchingPatients = [...new Set(matchingPatients)]
      return matchingPatients
    },
    getMatchingPatients (allPatients, matchingPatientIds) {
      return allPatients.filter((patient) => {
        return matchingPatientIds.indexOf(patient.label) > -1
      })
    },
    countFeaturesForMatches (features) {
      features.forEach((symptom) => {
        this.symptomCounter[symptom.value] = 0
        this.symptomMap[symptom.value] = symptom.text
        this.matchingPatientPhenotypes.forEach((patient) => {
          if (patient[symptom.value].id === 'T') {
            this.symptomCounter[symptom.value] += 1
          }
        })
      })
    },
    filterSingleFeatures () {
      return Object.keys(this.symptomCounter)
        .filter(
          (key) => { return this.symptomCounter[key] > 1 })
        .sort((a, b) => { return this.symptomCounter[b] - this.symptomCounter[a] })
    },
    createOutputTable () {
      const outputTable = this.relevantSymptoms.map(
        (symptom) => {
          return {
            feature: this.symptomMap[symptom],
            count: `${this.symptomCounter[symptom]} / ${this.total}`,
            percentage: this.getPercentage(this.symptomCounter[symptom], this.total)
          }
        })
      return outputTable
    },
    getMatchingArrayData () {
      this.matchingArrays = []
      this.table_loaded = false
      const filteredData = this.filterArrayData(this.$store.state.array)
      this.matchingArrays = this.reformatArrayData(filteredData)
      const matchingPatientIds = this.getUniqueMatchingPatientIds(this.matchingArrays)
      this.matchingPatientPhenotypes = this.getMatchingPatients(this.$store.state.patients, matchingPatientIds)
      this.countFeaturesForMatches(this.$store.state.phenotypes)
      this.relevantSymptoms = this.filterSingleFeatures()
      this.table = this.createOutputTable()
      this.table_loaded = true
    },
    isMatchingAberration (type) {
      return type === this.aberration_type
    },
    isWithinRegion (start, stop) {
      return start < this.stop && stop > this.start
    },
    isWithinOverlap (start, stop) {
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
    },
    clearTable () {
      this.table = []
      this.table_loaded = false
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
      relevantSymptoms: [],
      table: [],
      symptomMap: {},
      symptomCounter: {},
      table_loaded: false
    }
  },
  computed: {
    ...mapGetters(['getReadyForBusiness']),
    total: function () {
      return this.matchingPatientPhenotypes.length
    },
    bpOverlap: function () {
      const length = this.stop - this.start
      return this.overlap ? Math.round(length * parseInt(this.overlap) / 100) : 0
    },
    readyToStart: function () {
      return this.getReadyForBusiness
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
